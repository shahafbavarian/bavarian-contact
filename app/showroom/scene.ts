import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// The showroom, built from the real one (docs/SHOWROOM_HALL.md): a glass
// street front with the lit sign, dark polished floor, black gloss columns,
// grooved white walls, ceiling spots, glass offices at the back.
//
// Art-directed rather than photoreal (the lesson from Bruno Simon's folio):
// a two-tone night background, warm light pools painted onto the floor,
// tinted shadows, a restrained bloom, tilt-shift blur on desktop.
// Everything that moves is a pure function of one scroll progress value
// (the Lusion pattern), so scrolling back replays it exactly in reverse.

export type SceneHandle = {
  setProgress: (p: number) => void
  setPointer: (x: number, y: number) => void
  /** Rotate the ring by whole cards (buttons, keyboard). */
  step: (dir: 1 | -1) => void
  resize: () => void
  /** Offline rendering: place the camera at p and draw one frame now */
  renderFrame: (p: number) => void
  dispose: () => void
  stats: () => { frames: number; avg: number; p95: number; calls: number; tris: number; dpr: number; angle: number; drag: number; progress: number; front: number }
}

// A card on the floating gallery: one of the site's destinations. One image
// = a photo card, several = a mosaic, none = a typographic card.
export type Card = { title: string; sub: string; href: string; external?: boolean; images: string[] }
type Opts = {
  mobile: boolean; logoUrl: string; cards: Card[]; font: string
  onFront: (i: number) => void
  onOpen: (i: number) => void
  /** the dark middle screen was tapped from the street: switch on and walk in */
  onEnter?: () => void
  /** where the sign on the building lands on screen (css px: centre, width) */
  onSign?: (x: number, y: number, w: number, visible: boolean) => void
  /** screen height (css px) of the front card's centre, for the arrows beside it */
  onGallery?: (y: number, x: number) => void
  /** every texture of the opening view has loaded: show the canvas */
  onReady?: () => void
  /** Offline rendering: no loop, fixed pixel ratio, full-resolution reflections */
  manual?: boolean
  dpr?: number
}

const fit = (v: number, a: number, b: number, from = 0, to = 1) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return from + (to - from) * t
}
const smooth = (t: number) => t * t * (3 - 2 * t)

// ─── Procedural textures (no photos: the place is drawn, not pasted) ───
function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  draw(cv.getContext('2d')!)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 16   // clamped by the GPU's maximum; keeps the floor sharp at grazing angles
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat) }
  return t
}

function noise(c: CanvasRenderingContext2D, w: number, h: number, amt: number) {
  const img = c.getImageData(0, 0, w, h)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amt
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n
  }
  c.putImageData(img, 0, 0)
}

// Large-format porcelain, warm graphite, hairline grout. One texture = 2x2 tiles.
const floorTex = (rx: number, ry: number) => canvasTex(512, 512, c => {
  c.fillStyle = '#3b3a38'; c.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 4; i++) {
    const x = (i % 2) * 256, y = Math.floor(i / 2) * 256
    c.fillStyle = `rgba(${i % 3 ? 255 : 0},${i % 3 ? 245 : 0},${i % 3 ? 235 : 0},0.025)`
    c.fillRect(x, y, 256, 256)
  }
  noise(c, 512, 512, 10)
  c.fillStyle = '#242322'
  c.fillRect(0, 0, 512, 3); c.fillRect(0, 256, 512, 3); c.fillRect(0, 0, 3, 512); c.fillRect(256, 0, 3, 512)
}, [rx, ry])

// The showroom's grooved wall: groups of three dark lines.
const wallTex = (rx: number) => canvasTex(256, 512, c => {
  c.fillStyle = '#d2d0cb'; c.fillRect(0, 0, 256, 512)
  noise(c, 256, 512, 5)
  c.fillStyle = 'rgba(40,38,36,.55)'
  for (const g of [120, 300]) for (let k = 0; k < 3; k++) c.fillRect(0, g + k * 14, 256, 2)
}, [rx, 1])

const stripeTex = () => canvasTex(64, 256, c => {
  c.clearRect(0, 0, 64, 256)
  c.fillStyle = 'rgba(255,255,255,.55)'
  for (let k = 0; k < 6; k++) c.fillRect(0, 96 + k * 9, 64, 5)
})

// Tilt-shift: blur grows toward the top and bottom of the frame
// (Bruno Simon's cheapDOF: smoothstep(.2,.5,|uv.y-.5|), 12 taps here).
const TiltShift = {
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uAmount: { value: 2.2 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uAmount; varying vec2 vUv;
    void main(){
      float s = smoothstep(.22, .5, abs(vUv.y - .5)) * uAmount;
      vec4 col = texture2D(tDiffuse, vUv);
      if (s < .01) { gl_FragColor = col; return; }
      vec4 acc = col; float n = 1.;
      for (int i = 0; i < 12; i++) {
        float a = float(i) * 2.39996; float r = sqrt(float(i) + .5) / 3.5;
        acc += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * r * s / uRes * 3.);
        n += 1.;
      }
      gl_FragColor = acc / n;
    }`,
}

export function createShowroom(canvas: HTMLCanvasElement, opts: Opts): SceneHandle {
  const { mobile } = opts
  const dpr = opts.dpr ?? Math.min(window.devicePixelRatio || 1, 2)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', precision: 'highp', preserveDrawingBuffer: !!opts.manual })
  renderer.setPixelRatio(dpr)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  // the studio environment lights every surface softly, as on the live page
  scene.environment = env
  scene.environmentIntensity = 0.35
  // Scanned materials (Poly Haven, CC0)
  // the opening view waits for its textures, so nothing pops in under the lights
  let assetsReady = false
  let readyAt = -1
  const ready = () => { if (assetsReady) return; assetsReady = true; readyAt = performance.now(); dirty = true; opts.onReady?.() }
  const manager = new THREE.LoadingManager(ready, undefined, ready)
  setTimeout(ready, 4000)                                         // never hold the page back for long
  const texLoader = new THREE.TextureLoader(manager)
  const scanned = (url: string, rx: number, ry: number, srgb = false) => {
    const t = texLoader.load(url, () => { dirty = true })
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 16
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    return t
  }

  // Two-tone night background (Bruno's radial fog colours, as a gradient dome)
  scene.background = canvasTex(4, 256, c => {
    const g = c.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#06080c'); g.addColorStop(0.55, '#121823'); g.addColorStop(1, '#1d2430')
    c.fillStyle = g; c.fillRect(0, 0, 4, 256)
  })
  scene.fog = new THREE.Fog('#141a24', 26, 70)

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120)

  // ─── Dimensions (metres) ───
  const W = 20, D = 24, H = 4.6, FRONT = 0
  const half = W / 2

  const mats = {
    // dark anodised aluminium (frames, mullions)
    metal: new THREE.MeshStandardMaterial({ color: '#2a2d31', roughness: 0.38, metalness: 0.85, envMapIntensity: 1.1 }),
    // black piano lacquer (columns, stand): a clear coat over a satin base
    gloss: new THREE.MeshPhysicalMaterial({ color: '#050506', roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.6 }),
    glass: new THREE.MeshStandardMaterial({ color: '#6f8496', roughness: 0.04, metalness: 1, transparent: true, opacity: 0.12, envMapIntensity: 3, depthWrite: false }),
    // matte surfaces take their light from the room's own lights, as in the live
    // version; the environment photo is only for the glossy ones
    ceiling: new THREE.MeshStandardMaterial({ color: '#c9c6c0', roughness: 0.95, envMapIntensity: 0.25 }),
    // the hall's walls take their light only from its own (symmetric) downlights
    wall: new THREE.MeshStandardMaterial({ map: wallTex(6), roughness: 0.85, envMapIntensity: 0.08 }),
  }

  const flat = new THREE.Scene(); flat.background = new THREE.Color(1, 1, 1)
  mats.wall.envMap = pmrem.fromScene(flat).texture   // walls: one even fill from every side, no tone jump at the corners
  const add = <T extends THREE.Object3D>(o: T) => { scene.add(o); return o }
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)); b.position.set(x, y, z); return b
  }
  // Light pools and contact shadows: a radial falloff computed in the shader.
  // (Not canvas gradients: Safari dithers those, and the additive light
  // amplified the dither into coloured speckles on the floor.)
  const radialVert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }'
  const radialFrag = 'uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; void main(){ float r = length(vUv - .5) * 2.; float a = 1. - smoothstep(0., 1., r); gl_FragColor = vec4(uColor, a * a * uOpacity); }'
  // ─── Power: the page opens on a dark hall; then its lights come on in a
  //     quick run from the doors to the back, and the sign last ───
  // One clock, run by walking in (see place): each
  // light ramps over a quarter second, the starts spread from the doors to
  // the back over 0.3 s: one quick wave of about 0.6 s.
  const powered: { d: number; len: number; set: (k: number) => void }[] = []
  const power = (d: number, set: (k: number) => void, len = 0.25) => { powered.push({ d, len, set }); set(0) }
  const depthDelay = (z: number) => Math.min(1, Math.max(0, -z / D)) * 0.3
  const POWER_END = 0.6
  const LIT = 0.1          // the walk's first step: the hall lights up while you still see it from the street
  const glow = (kind: 'light' | 'shadow', w: number, d: number, x: number, z: number, y: number, opacity: number, color = '#ffd6aa', always = false) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(kind === 'light' ? color : '#000000') }, uOpacity: { value: opacity } },
      vertexShader: radialVert, fragmentShader: radialFrag, transparent: true, depthWrite: false,
      blending: kind === 'light' ? THREE.AdditiveBlending : THREE.NormalBlending,
    }))
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m)
    if (kind === 'light' && z < FRONT && !always) power(depthDelay(z), k => {   // light on the street is on from the start
      (m.material as THREE.ShaderMaterial).uniforms.uOpacity.value = opacity * k })
    return m
  }

  // ─── Floor: a real mirror under a semi-opaque polished tile ───
  const reflScale = opts.manual ? 0.75 : mobile ? 0.3 : 0.5
  // Phones skip the mirror (a second full render at reduced resolution is
  // what shimmered in motion); the tile's own gloss carries the reflection.
  const mirror = new Reflector(new THREE.PlaneGeometry(W, D), {
    textureWidth: Math.round(innerWidth * dpr * reflScale),
    textureHeight: Math.round(innerHeight * dpr * reflScale),
    color: 0x5a5a5a,
  })
  mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, 0, FRONT - D / 2)
  if (!mobile) scene.add(mirror)
  const tile = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({
    map: floorTex(W / 2.4, D / 2.4), roughness: mobile ? 0.16 : 0.3, metalness: 0, transparent: !mobile, opacity: mobile ? 1 : 0.72, envMapIntensity: mobile ? 0.9 : 0.25,
  }))
  tile.rotation.x = -Math.PI / 2; tile.position.set(0, 0.002, FRONT - D / 2)
  scene.add(tile)

  // Street paving outside
  // concrete slabs scanned from a real pavement, ~2.5 m per tile
  // concrete slabs scanned from a real pavement (Poly Haven, CC0), ~2.5 m each
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({
    map: scanned('/showroom/pave_diff.jpg', 24, 12, true),
    normalMap: scanned('/showroom/pave_nor.jpg', 24, 12),
    roughnessMap: scanned('/showroom/pave_arm.jpg', 24, 12),
    roughness: 1, envMapIntensity: 0.4, color: '#c9cacb',
  }))
  pave.rotation.x = -Math.PI / 2; pave.position.set(0, 0, FRONT + 15)
  scene.add(pave)

  // ─── Shell ───
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mats.ceiling)
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, FRONT - D / 2); scene.add(ceil)
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(D, H), mats.wall)
    w.rotation.y = -s * Math.PI / 2; w.position.set(s * half, H / 2, FRONT - D / 2); scene.add(w)
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mats.wall)
  back.position.set(0, H / 2, FRONT - D); scene.add(back)

  // ─── The building around the showroom, as it really is: the glass front
  //     sits back under a deep canopy; above it, warm sand-coloured stone in
  //     large panels runs up the full height; (no outside columns:
  //     only the black ones inside) ───
  const CANOPY = 2.4
  const stoneTex = canvasTex(1024, 1024, c => {
    const cols = 4, rows = 4, pw = 1024 / cols, ph = 1024 / rows
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const v = Math.random() * 18 - 9
      c.fillStyle = `rgb(${190 + v},${170 + v},${146 + v})`
      c.fillRect(k * pw, r * ph, pw, ph)
    }
    noise(c, 1024, 1024, 16)
    c.fillStyle = 'rgba(70,58,46,.55)'
    for (let r = 0; r <= rows; r++) c.fillRect(0, r * ph - 2, 1024, 4)
    for (let k = 0; k <= cols; k++) c.fillRect(k * pw - 2, 0, 4, 1024)
  }, [(W + 16) / 4.8, 34 / 3.6])
  // rows of 0.9 m set so that one row runs centred through the sign
  stoneTex.offset.y = 0.125
  const stone = new THREE.Mesh(new THREE.PlaneGeometry(W + 16, 34), new THREE.MeshStandardMaterial({
    map: stoneTex, normalMap: scanned('/showroom/stone_nor.jpg', (W + 16) / 2.4, 34 / 2.4), normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 0.85, emissiveMap: stoneTex, emissive: new THREE.Color('#5a4c3c'), emissiveIntensity: 0.55,
  }))
  // the stone comes down to the canopy's edge: stone, then the soffit, then the glass
  stone.position.set(0, H + 17, FRONT + CANOPY); scene.add(stone)
  // canopy soffit: dark grey panels over the pavement, catching the shop light
  const soffitTex = canvasTex(512, 256, c => {
    c.fillStyle = '#2b2e31'; c.fillRect(0, 0, 512, 256); noise(c, 512, 256, 8)
    c.fillStyle = 'rgba(0,0,0,.6)'; for (let x = 0; x <= 512; x += 128) c.fillRect(x - 2, 0, 3, 256)
  }, [(W + 16) / 3, 1])
  const soffit = new THREE.Mesh(new THREE.PlaneGeometry(W + 16, CANOPY), new THREE.MeshStandardMaterial({ map: soffitTex, roughness: 0.7 }))
  soffit.rotation.x = Math.PI / 2 - 0.03; soffit.position.set(0, H + 0.04, FRONT + CANOPY / 2); scene.add(soffit)
  box(4, H, 0.6, mats.metal, -half - 2, H / 2, FRONT - 0.3)
  box(4, H, 0.6, mats.metal, half + 2, H / 2, FRONT - 0.3)

  // ─── Glass street front: mullions every 2.5 m, sliding doors in the middle ───
  const glassH = H
  for (let x = -half; x <= half + 0.01; x += 2.5) {
    if (Math.abs(x) < 0.01) continue   // the doors open here: nothing to walk through
    box(0.09, glassH, 0.14, mats.metal, x, glassH / 2, FRONT)
  }
  box(W, 0.12, 0.16, mats.metal, 0, glassH - 0.06, FRONT)
  box(W, 0.06, 0.16, mats.metal, 0, 0.03, FRONT)
  for (let x = -half + 1.25; x < half; x += 2.5) {
    if (Math.abs(x) < 1.3) continue // door bay
    const g = new THREE.Mesh(new THREE.PlaneGeometry(2.4, glassH), mats.glass)
    g.position.set(x, glassH / 2, FRONT); scene.add(g)
  }
  // fixed panes beside the sliding leaves (the leaves park over them)
  for (const sx of [-1, 1]) {
    const fp = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.7), mats.glass)
    fp.position.set(sx * 1.85, 1.35, FRONT); scene.add(fp)
  }
  box(5, glassH - 2.75, 0.02, mats.glass, 0, 2.75 + (glassH - 2.75) / 2, FRONT)   // transom glass over the doors
  const doors: THREE.Mesh[] = []
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.7), mats.glass)
    d.position.set(s * 0.6, 1.35, FRONT + 0.04); scene.add(d); doors.push(d)
    const frame = box(0.05, 2.7, 0.06, mats.metal, s * 1.2, 1.35, FRONT + 0.04)
    d.userData.frame = frame
  }
  box(2.5, 0.1, 0.16, mats.metal, 0, 2.75, FRONT + 0.02)

  // ─── The sign on the stone over the canopy. The letters are the page's own
  //     logo image (with the lit look approved on the live page), placed every
  //     frame exactly where this spot of the wall lands on screen, so it sits
  //     on the building and moves with it ───
  const loader = new THREE.TextureLoader(manager)
  const signW = 4.4
  const SIGN_Y = H + 1.8, SIGN_Z = FRONT + CANOPY   // the middle of a stone row
  // its light on the stone, even along the whole sign: a row of small lamps
  // close to the wall, and a soft band flat across the letters that fades
  // only past their ends (out of reach of the soffit and the street)
  const signLamps = [-1.8, -0.6, 0.6, 1.8].map(x => {
    const l = new THREE.PointLight('#fff1e2', 0.4, 3.5, 2); l.position.set(x, SIGN_Y, SIGN_Z + 0.7); scene.add(l); return l
  })
  const washFrag = 'uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; void main(){ vec2 p = abs(vUv - .5) * 2.; float a = (1. - smoothstep(.62, 1., p.x)) * (1. - smoothstep(.1, 1., p.y)); gl_FragColor = vec4(uColor, a * a * uOpacity); }'
  const signWash = new THREE.Mesh(new THREE.PlaneGeometry(signW * 1.45, 2.2), new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#fff0de') }, uOpacity: { value: 0.1 } },
    vertexShader: radialVert, fragmentShader: washFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }))
  signWash.position.set(0, SIGN_Y, SIGN_Z + 0.005); scene.add(signWash)
  // its light on the stone comes up with the letters (the page brings them
  // on 200 ms after the view is ready, over a second: the same beat)
  const signLight = (k: number) => {
    for (const l of signLamps) l.intensity = 0.4 * k
    ;(signWash.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.1 * k
  }
  signLight(0)
  // the street side is lit already when the page opens: only the hall's lights run
  const signL = new THREE.Vector3(), signR = new THREE.Vector3()
  const reportSign = () => {
    if (!opts.onSign) return
    signL.set(-signW / 2, SIGN_Y, SIGN_Z).project(camera); signR.set(signW / 2, SIGN_Y, SIGN_Z).project(camera)
    const cw = canvas.clientWidth, ch = canvas.clientHeight
    opts.onSign(((signL.x + signR.x) / 4 + 0.5) * cw, (0.5 - (signL.y + signR.y) / 4) * ch, (signR.x - signL.x) / 2 * cw, signL.z < 1 && signR.z < 1)
    if (opts.onGallery) { signL.set(0, ring.position.y, STAND.z + R).project(camera); opts.onGallery((0.5 - signL.y / 2) * ch, (signL.x / 2 + 0.5) * cw) }
  }
  // Entrance mat, just inside: a needle-punch carpet. Charcoal pile you can
  // see the fibres of, the logo woven in a lighter yarn (the pile runs through
  // it, nothing is printed on top), a black rubber edge
  const MW = 3.08, MD = 1.48
  const matCv = document.createElement('canvas'); matCv.width = 1024; matCv.height = Math.round(1024 * MD / MW)
  const mc = matCv.getContext('2d')!
  const weave = (c: CanvasRenderingContext2D, base: number, spread: number, n: number) => {
    for (let k = 0; k < n; k++) {
      const v = base + Math.random() * spread, a = Math.random() * Math.PI
      c.fillStyle = `rgb(${v},${v - 1},${v - 3})`
      c.setTransform(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), Math.random() * matCv.width, Math.random() * matCv.height)
      c.fillRect(0, 0, 1.4, 3 + Math.random() * 5)
    }
    c.setTransform(1, 0, 0, 1, 0, 0)
  }
  mc.fillStyle = '#2c2b2a'; mc.fillRect(0, 0, matCv.width, matCv.height); weave(mc, 22, 40, 60000)
  const matTex = new THREE.CanvasTexture(matCv); matTex.colorSpace = THREE.SRGBColorSpace; matTex.anisotropy = 16
  // through the loading manager: the page waits for it, so the logo is never late on the mat
  new THREE.ImageLoader(manager).load(opts.logoUrl, logoImg => {
    const lc = document.createElement('canvas'); lc.width = matCv.width; lc.height = matCv.height
    const l = lc.getContext('2d')!
    l.fillStyle = '#8f8b86'; l.fillRect(0, 0, lc.width, lc.height); weave(l, 105, 70, 60000)
    // keep the light yarn only inside the logo (turned to read from the hall, as before)
    const lw = lc.width * (2.2 / MW), lh = lw * (logoImg.height / logoImg.width)
    l.globalCompositeOperation = 'destination-in'
    l.translate(lc.width / 2, lc.height / 2); l.rotate(Math.PI); l.drawImage(logoImg, -lw / 2, -lh / 2, lw, lh)
    mc.drawImage(lc, 0, 0); matTex.needsUpdate = true; dirty = true
  })
  const matEdge = new THREE.Mesh(new THREE.BoxGeometry(MW + 0.16, 0.014, MD + 0.16), new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 0.8 }))
  matEdge.position.set(0, 0.007, FRONT - 1.3); scene.add(matEdge)
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(MW, MD), new THREE.MeshStandardMaterial({ map: matTex, roughness: 1, envMapIntensity: 0 }))
  mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.0145, FRONT - 1.3); scene.add(mat)

  // ─── Columns: black gloss, two on the floor ───
  const colGeo = new THREE.CylinderGeometry(0.34, 0.34, H, 48)
  for (const [x, z] of [[-4.4, -7.2], [5.4, -15]]) {
    const c = new THREE.Mesh(colGeo, mats.gloss); c.position.set(x, H / 2, z); scene.add(c)
  }

  // ─── Ceiling spots + their light pools on the floor ───
  const spotGeo = new THREE.CircleGeometry(0.09, 24)
  const spotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.1, 1.7), toneMapped: false })
  const spots: [number, number][] = []
  // staggered rows, each symmetric about the centre line (the old offset
  // pushed every row 0.9 m to one side)
  for (let r = 0, z = -2; z > -D + 1; r++, z -= 3) {
    for (const x of r % 2 ? [-5.625, -1.875, 1.875, 5.625] : [-7.5, -3.75, 0, 3.75, 7.5]) spots.push([x, z])
  }
  const spotMesh = new THREE.InstancedMesh(spotGeo, spotMat, spots.length)
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))
  spots.forEach(([x, z], i) => {
    spotMesh.setMatrixAt(i, m4.compose(new THREE.Vector3(x, H - 0.01, z), q, new THREE.Vector3(1, 1, 1)))
    glow('light', 3.0, 3.0, x, z, 0.004, 0.16)
  })
  scene.add(spotMesh)
  const spotC = new THREE.Color()
  spots.forEach(([, z], i) => power(depthDelay(z), k => {
    spotMesh.setColorAt(i, spotC.setScalar(0.03 + 0.97 * k)); spotMesh.instanceColor!.needsUpdate = true
  }))
  // Interior spill onto the street
  glow('light', 22, 9, 0, FRONT + 3.2, 0.01, 0.3, '#ffd2a0')

  // ─── Light and shade that make a room read as real ───
  // scallops: each downlight near a wall washes it in a soft arc
  const scallopFrag = 'uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; void main(){ vec2 p = vec2((vUv.x - .5) * 2., (1. - vUv.y)); float a = (1. - smoothstep(0., 1., length(vec2(p.x, p.y * .55)))) * smoothstep(0., .08, p.y); gl_FragColor = vec4(uColor, a * a * uOpacity); }'
  const scallopMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#ffdcb4') }, uOpacity: { value: 0.32 } },
    vertexShader: radialVert, fragmentShader: scallopFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
  for (let z = -2; z > -D + 4; z -= 3) for (const sx of [-1, 1]) {
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.4), scallopMat)
    sc.rotation.y = -sx * Math.PI / 2; sc.position.set(sx * (half - 0.01), H - 1.7, z); scene.add(sc)
  }
  // contact shading where walls meet the floor and the ceiling
  const edgeFrag = 'uniform float uOpacity; varying vec2 vUv; void main(){ float a = pow(1. - vUv.y, 2.2); gl_FragColor = vec4(0., 0., 0., a * uOpacity); }'
  const edgeMat = (o: number) => new THREE.ShaderMaterial({ uniforms: { uOpacity: { value: o } }, vertexShader: radialVert, fragmentShader: edgeFrag, transparent: true, depthWrite: false })
  for (const sx of [-1, 1]) {
    const wb = new THREE.Mesh(new THREE.PlaneGeometry(D, 0.7), edgeMat(0.45))
    wb.rotation.y = -sx * Math.PI / 2; wb.position.set(sx * (half - 0.012), 0.35, FRONT - D / 2); scene.add(wb)
    const cb = new THREE.Mesh(new THREE.PlaneGeometry(D, 0.6), edgeMat(0.3))
    cb.rotation.y = -sx * Math.PI / 2; cb.rotation.z = Math.PI; cb.position.set(sx * (half - 0.012), H - 0.3, FRONT - D / 2); scene.add(cb)
  }
  for (const [x, z] of [[-4.4, -7.2], [5.4, -15]]) glow('shadow', 1.6, 1.6, x, z, 0.0035, 0.55)

  // ─── Light ───
  add(new THREE.HemisphereLight('#ffe8d2', '#101318', 0.16))
  for (const [x, z] of [[-5, -4], [5, -4], [-5, -13], [5, -13], [0, -20]]) {
    const l = new THREE.PointLight('#ffcf98', 5, 11, 1.8); l.position.set(x, H - 0.4, z); scene.add(l)
    // the two by the entrance stay on: theirs is the light on the pavement outside
    if (z !== -4) power(depthDelay(z), k => { l.intensity = 5 * k })
  }
  // night sky light from straight in front: it lights the facade evenly and
  // falls on neither inner wall more than the other
  // light bouncing up off the floor onto the ceiling (only faces looking down catch it)
  const bounce = new THREE.DirectionalLight('#ffe2c6', 0.9); bounce.position.set(0, -10, -12); bounce.target.position.set(0, 0, -12); scene.add(bounce, bounce.target)
  power(0.05, k => { scallopMat.uniforms.uOpacity.value = 0.32 * k }, 0.35)
  // the hall's own surfaces take the soft fill from their own copy of the
  // environment, so it can go dark with the lights while the street keeps its own
  const tileMat = tile.material as THREE.MeshStandardMaterial
  mats.ceiling.envMap = env; tileMat.envMap = env
  power(0, k => {
    mats.wall.envMapIntensity = 0.05 + 0.23 * k
    mats.ceiling.envMapIntensity = tileMat.envMapIntensity = 0.06 + 0.29 * k
  }, 0.4)
  const moon = new THREE.DirectionalLight('#8ea6d6', 0.6); moon.position.set(0, 10, 14); scene.add(moon)

  // ─── The stand: one gloss plinth in the middle of the hall, a light ring at
  //     its edge, and the gallery hovering above it ───
  const STAND = new THREE.Vector3(0, 0, -12.5)
  const N = opts.cards.length
  // card size (m), canvas 1024×832 — larger on a phone, where it must read at arm's length
  const CW = mobile ? 3.0 : 2.3, CH = CW * (832 / 1024)
  // The ring grows with the number of cars: every card gets a clear gap of
  // 35% of its width on each side, so no two cars ever touch
  const R = Math.max(3.0, (N * CW * 1.35) / (Math.PI * 2))
  const PR = R + 0.7                              // plinth radius
  // satin, not piano gloss: a mirror-bright edge caught the lamps as a stray streak by the ring
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR + 0.06, 0.08, 160), new THREE.MeshStandardMaterial({ color: '#070708', roughness: 0.45, metalness: 0 }))
  plinth.position.set(STAND.x, 0.04, STAND.z); scene.add(plinth)
  // The light ring at the plinth's edge, drawn as a line of light in the
  // shader, not a 1.4 cm tube: from the street a tube is thinner than a pixel
  // and breaks into dashes. The line never gets thinner than about a pixel
  // and a half (fwidth), and dims a little as it widens. No glow around it.
  const ringMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(2.2, 1.95, 1.6) }, uR: { value: PR + 0.03 }, uW: { value: 0.012 } },
    vertexShader: 'varying vec2 vPos; void main(){ vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 uColor; uniform float uR; uniform float uW; varying vec2 vPos;
      void main(){
        // measured in screen pixels, so the line is equally thin all round the
        // ellipse (at its ends, seen edge-on, it used to swell into a blob)
        float r = length(vPos), aa = max(fwidth(r), 1e-6), px = abs(r - uR) / aa;
        float hw = max(uW / aa, .75);                     // half-width in pixels, never under ~1.5 px
        float core = clamp(hw + .5 - px, 0., 1.) * mix(.6, 1., min(1., uW / aa / .75));
        gl_FragColor = vec4(uColor * core, 1.);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  })
  const lightRing = new THREE.Mesh(new THREE.RingGeometry(PR - 0.1, PR + 0.16, 512, 1), ringMat)
  lightRing.rotation.x = -Math.PI / 2; lightRing.position.set(STAND.x, 0.083, STAND.z); scene.add(lightRing)
  glow('shadow', PR * 2.4, PR * 2.4, STAND.x, STAND.z, 0.003, 0.45)
  glow('light', PR * 2.6, PR * 2.6, STAND.x, STAND.z, 0.084, 0.42)   // the light on the plinth goes out with the hall

  // ─── Back: glass offices with frosted bands ───
  const officeZ = FRONT - D + 4
  // frames set symmetric about the hall's centre line, the stand's axis
  for (const x of [-8, -4.8, -1.6, 1.6, 4.8, 8]) box(0.06, H, 0.08, mats.metal, x, H / 2, officeZ)
  const frosted = new THREE.MeshBasicMaterial({ map: stripeTex(), transparent: true, opacity: 0.55, depthWrite: false })
  const og = new THREE.Mesh(new THREE.PlaneGeometry(W - 4, H), frosted); og.position.set(0, H / 2, officeZ); scene.add(og)
  const og2 = new THREE.Mesh(new THREE.PlaneGeometry(W - 4, H), mats.glass); og2.position.set(0, H / 2, officeZ + 0.01); scene.add(og2)
  // ─── The gallery: cards bent along the ring. Each card is designed, not a
  //     pasted photo: the car's photograph in a rounded frame, a band with the
  //     model and price, a hairline edge. Unlit, so the photos keep their
  //     true colour; cards off the front dim and recede. ───
  const cards = opts.cards
  const STEP = N ? (Math.PI * 2) / N : 1
  const ARC = CW / R
  const cardGeo = new THREE.CylinderGeometry(R, R, CH, 24, 1, true, -ARC / 2, ARC)
  const cardVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`
  const cardFrag = `
    uniform sampler2D map; uniform float uDim; uniform float uAlpha; uniform float uReady; uniform float uPower; uniform float uIcon; uniform vec2 uSize; varying vec2 vUv;
    float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
    float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
    void main(){
      vec2 p = (vUv - .5) * uSize;
      float d = rbox(p, uSize * .5, .055);
      float a = 1. - smoothstep(-.004, .002, d);
      vec3 col = mix(vec3(.075, .078, .085), texture2D(map, vUv).rgb, uReady);
      // switched on like a screen: the picture opens out of a bright line
      // across the middle, with a flash, then settles
      float open = smoothstep(0., .55, uPower);
      float pic = step(abs(vUv.y - .5), open * .5 + .004) * step(.001, uPower);
      col = mix(vec3(.018, .019, .022), col + (1. - smoothstep(.35, 1., uPower)) * .6, pic);
      // standby: the power symbol printed on the dark middle screen, unlit grey,
      // gone the moment the screen switches on (tapping it walks you in)
      vec2 q = p - vec2(0., -.03);
      float ringD = abs(length(q) - .24) - .022;
      if (abs(atan(q.x, q.y)) < .6) ringD = 1.;                  // the gap at the top
      float iconD = min(ringD, seg(q, vec2(0., .02), vec2(0., .29)) - .022);
      float iaa = fwidth(iconD);
      col = mix(col, vec3(.12, .124, .13), (1. - smoothstep(-iaa, iaa, iconD)) * uIcon * (1. - step(.001, uPower)));
      col += smoothstep(-.012, -.002, d) * .10;           // hairline edge
      col *= mix(1., .28, uDim);                          // cards away from the front recede
      gl_FragColor = vec4(col, a * uAlpha);
      #include <colorspace_fragment>
    }`
  const ring = new THREE.Group()
  ring.position.copy(STAND)
  scene.add(ring)
  const cardMeshes: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial>[] = []
  cards.forEach((_, i) => {
    const m = new THREE.Mesh(cardGeo, new THREE.ShaderMaterial({
      uniforms: { map: { value: null }, uDim: { value: 0 }, uAlpha: { value: 0 }, uReady: { value: 0 }, uPower: { value: 0 }, uIcon: { value: i === 0 ? 1 : 0 }, uSize: { value: new THREE.Vector2(CW, CH) } },
      vertexShader: cardVert, fragmentShader: cardFrag, transparent: true,
    }))
    // RTL: the next car waits on the left of the front card
    m.rotation.y = -i * STEP
    m.userData.index = i
    ring.add(m); cardMeshes.push(m)
  })

  // Card faces are composed on a canvas once the font and photo are in
  const loadImg = async (src: string) => {
    const img = new Image(); img.decoding = 'async'; img.src = src
    try { await img.decode(); return img } catch { return null }
  }
  const cover = (c: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, fy = 0.5) => {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight)
    const iw = img.naturalWidth * s, ih = img.naturalHeight * s
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip()
    c.drawImage(img, x + (w - iw) / 2, y + (h - ih) * fy, iw, ih); c.restore()
  }
  const drawCard = async (card: Card, mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial>) => {
    const imgs = (await Promise.all(card.images.map(loadImg))).filter(Boolean) as HTMLImageElement[]
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 832
    const c = cv.getContext('2d')!
    c.fillStyle = '#121316'; c.fillRect(0, 0, 1024, 832)
    if (imgs.length === 1) cover(c, imgs[0], 0, 0, 1024, 640, 0.62)
    else if (imgs.length > 1) {
      // portrait mosaic: 4 × 2, hairline gaps
      const cols = 4, rows = 2, g = 4, cw = (1024 - g * (cols - 1)) / cols, rh = (640 - g * (rows - 1)) / rows
      imgs.slice(0, cols * rows).forEach((im, k) => cover(c, im, (k % cols) * (cw + g), Math.floor(k / cols) * (rh + g), cw, rh, 0.2))
    } else {
      const g = c.createLinearGradient(0, 0, 1024, 640)
      g.addColorStop(0, '#1c1f24'); g.addColorStop(1, '#0e0f12')
      c.fillStyle = g; c.fillRect(0, 0, 1024, 640)
      c.fillStyle = 'rgba(242,239,233,.9)'; c.textAlign = 'center'; c.textBaseline = 'middle'
      c.font = `600 120px ${opts.font}`; c.fillText(card.title, 512, 330)
    }
    c.direction = 'rtl'; c.textAlign = 'right'; c.textBaseline = 'alphabetic'
    c.fillStyle = '#f2efe9'; c.font = `600 58px ${opts.font}`
    c.fillText(card.title, 984, 730)
    c.font = `400 34px ${opts.font}`; c.fillStyle = 'rgba(242,239,233,.6)'
    c.fillText(card.sub, 984, 790)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
    mesh.material.uniforms.map.value = tex
    mesh.material.uniforms.uReady.value = 1
    dirty = true
  }
  let loaded = false
  const loadCards = () => {
    if (loaded) return
    loaded = true
    document.fonts?.load(`600 46px ${opts.font}`).catch(() => {}).finally(() => {
      cards.forEach((card, i) => drawCard(card, cardMeshes[i]))
    })
  }

  // ─── Post: bloom (only the sign, spots and rings exceed 1), tilt-shift on desktop ───
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })
  const composer = new EffectComposer(renderer, rt)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.5, 1.0)
  if (!mobile) composer.addPass(bloom)   // half-res bloom on tiny lights flickered on phones
  const tilt = new ShaderPass(TiltShift)
  if (!mobile) composer.addPass(tilt)
  composer.addPass(new OutputPass())

  // ─── Camera: street → doors → inside → stops facing the stand. A narrow
  //     (portrait) screen stops further back so the front card and its
  //     neighbours still fit. ───
  let startZ = 16, endZ = 0, pitch0 = 0, pitch1 = 0
  const buildPath = (aspect: number) => {
    // the walk ends where the whole stand is in view
    startZ = aspect < 1 ? 12 : 16
    endZ = STAND.z + (aspect < 1 ? 11 : 8)
    pitch0 = aspect < 1 ? 0.004 : 0.04        // level at the street (no leaning facade)
    pitch1 = aspect < 1 ? -0.06 : -0.05       // a touch down to the stand at the end
  }

  // Progress map: 0 → .82 the walk in, .72 → .9 the gallery rises over the
  // stand. That is where the page scroll ends: the gallery itself only turns
  // sideways — finger, mouse or arrows — and always rests on a card.
  const WALK = 0.82
  let progress = 0, shown = -1, dirty = true, time = 0, tvClock = 0, hallClock = 0
  let drag = 0, angle = 0, dragging = false, front = -1
  const pointer = new THREE.Vector2(), pointerS = new THREE.Vector2()
  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3()


  function place(p: number, dt: number) {
    const t = smooth(fit(p, 0, WALK))
    const z = startZ + (endZ - startZ) * t
    const pitch = pitch0 + (pitch1 - pitch0) * t
    tmpP.set(0, 1.6, z)
    tmpL.set(pointerS.x * 0.5, 1.6 + Math.tan(pitch) * 30 + pointerS.y * 0.25, z - 30)
    camera.position.copy(tmpP); camera.lookAt(tmpL)
    const open = smooth(fit(z, 7.5, 2.5))     // the doors part as you reach them
    doors.forEach((d, i) => {
      const s = i === 0 ? -1 : 1
      d.position.x = s * (0.6 + open * 1.15)
      ;(d.userData.frame as THREE.Mesh).position.x = s * (1.2 + open * 1.15)
    })
    renderer.toneMappingExposure = 0.9 + 0.12 * fit(p, 0.3, 0.6)
    bloom.strength = 0.6 - 0.25 * fit(p, 0.4, 0.7)

    tvClock = p > LIT ? tvClock + dt : 0
    // the hall is dark from the street; its lights come on with the screens as
    // you walk in (the same run, doors to back) and go out as you walk away
    hallClock = Math.min(POWER_END, Math.max(0, hallClock + (p > LIT ? dt : -dt * 1.6)))
    for (const q of powered) q.set(smooth(fit(hallClock, q.d, q.d + q.len)))
    // Gallery: always there in the stand, seen from the street through the
    // glass too; it answers to the hand only once you are inside
    const target = drag
    angle += (target - angle) * (1 - Math.exp(-dt * 9))
    ring.rotation.y = angle
    ring.position.y = 1.72 + Math.sin(time * 0.9) * 0.035
    cardMeshes.forEach((m, i) => {
      let th = (-i * STEP + angle) % (Math.PI * 2)
      if (th > Math.PI) th -= Math.PI * 2
      if (th < -Math.PI) th += Math.PI * 2
      const u = m.material.uniforms
      u.uAlpha.value = 1
      // the screens are dark from the street and switch on as you walk in
      // (one after another), off again as you walk out
      if (p <= LIT || tvClock > 0.15 + i * 0.05) u.uPower.value = Math.min(1, Math.max(0, u.uPower.value + (p > LIT ? dt / 0.35 : -dt / 0.25)))
      u.uDim.value = smooth(fit(Math.abs(th), 0.18, 1.1))
    })
    const f = N ? ((Math.round(angle / STEP) % N) + N) % N : -1
    if (f !== front) { front = f; opts.onFront(f) }
  }

  function setSize() {
    const w = canvas.clientWidth, h = canvas.clientHeight
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    bloom.resolution.set(w * (mobile ? 0.5 : 1), h * (mobile ? 0.5 : 1))
    tilt.uniforms.uRes.value.set(w, h)
    const aspect = w / h
    camera.aspect = aspect
    // A normal lens, not a fisheye: the vertical field is capped at 68° on a
    // portrait phone (a wider one bends the facade and leans the columns)
    const hfov = 72
    camera.fov = THREE.MathUtils.clamp(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hfov) / 2) / aspect) * 180 / Math.PI, 42, 68)
    camera.updateProjectionMatrix()
    buildPath(aspect)
    dirty = true
  }
  setSize()

  // ─── Touch / mouse: every sideways swipe turns the ring by exactly one
  //     card, in the finger's direction; a tap on the front card opens it,
  //     on another card brings it to the front ───
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2()
  let downX = 0, downY = 0, moved = false
  const settle = () => {
    drag = Math.round(drag / STEP) * STEP
  }
  let tapOut = false
  const onDown = (e: PointerEvent) => {
    if (progress < 0.05) { tapOut = true; downX = e.clientX; downY = e.clientY; return }   // from the street: only a tap on the middle screen
    if (progress < WALK - 0.04) return
    dragging = true; moved = false; downX = e.clientX; downY = e.clientY
  }
  const onMove = (e: PointerEvent) => {
    if (!dragging || moved) return
    const dx = e.clientX - downX, ax = Math.abs(dx), ay = Math.abs(e.clientY - downY)
    if (ay > ax && ay > 6) { dragging = false; return }   // a vertical gesture: not ours
    if (ax < 28) return
    moved = true                                         // one card per swipe
    settle(); drag += Math.sign(dx) * STEP; dirty = true // swipe right, cards go right
  }
  const onUp = (e: PointerEvent) => {
    if (tapOut) {
      tapOut = false
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return
      const r = canvas.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObjects(cardMeshes, false)[0]
      if (hit && hit.object.userData.index === front) opts.onEnter?.()
      return
    }
    if (!dragging) return
    dragging = false
    if (moved) return
    if (Math.abs(e.clientY - downY) > 6) return
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(cardMeshes, false)[0]
    if (!hit) return
    const i = hit.object.userData.index as number
    if (i === front) { opts.onOpen(i); return }
    let d = (i - front) % N; if (d > N / 2) d -= N; if (d < -N / 2) d += N
    drag += d * STEP; dirty = true
  }
  canvas.addEventListener('pointerdown', onDown)
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('pointerup', onUp)
  addEventListener('pointercancel', () => { if (dragging) { dragging = false; settle() } })

  // ─── Loop: always running while the gallery floats; while walking it
  //     renders only when something moved ───
  const frames: number[] = []
  let last = performance.now(), raf = 0, running = true, sinceCheck = 0, curDpr = dpr, signDone = false
  const tick = (now: number) => {
    if (!running) return
    raf = requestAnimationFrame(tick)
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; time += dt   // (a rAF stamp can predate setup)
    pointerS.lerp(pointer, 1 - Math.exp(-dt * 4))
    loadCards()
    let signRising = false
    if (readyAt >= 0 && !signDone) { const k = smooth(fit(now - readyAt, 200, 1200)); signLight(0.28 + 0.72 * k); signDone = k >= 1; signRising = !signDone }
    const floating = progress > 0.7
    const moving = signRising || floating || dirty || Math.abs(progress - shown) > 1e-5 || pointerS.distanceToSquared(pointer) > 1e-6
    if (!moving) return
    dirty = false
    place(progress, dt); shown = progress
    composer.render(); reportSign()
    frames.push(dt * 1000); if (frames.length > 600) frames.shift()
    // a weak device: when 30 drawn frames average under ~38 fps, draw fewer
    // pixels (down to 1x); the motion stays smooth instead of the detail
    if (++sinceCheck >= 30) {
      const avg = frames.slice(-30).reduce((a, b) => a + b, 0) / 30
      sinceCheck = 0
      if (avg > 26 && curDpr > 1) { curDpr = Math.max(1, curDpr * 0.8); renderer.setPixelRatio(curDpr); composer.setPixelRatio(curDpr); setSize() }
    }
  }
  if (!opts.manual) raf = requestAnimationFrame(tick)

  return {
    renderFrame(p) { hallClock = p > LIT ? POWER_END : 0; progress = p; time = 0; place(p, 1 / 30); composer.render(); reportSign() },
    setProgress(p) { progress = p },
    setPointer(x, y) { if (!mobile) pointer.set(x, y) },
    step(dir) { settle(); drag += dir * STEP; dirty = true },
    resize: setSize,
    stats() {
      const s = [...frames].sort((a, b) => a - b)
      return {
        frames: s.length, avg: s.reduce((a, b) => a + b, 0) / (s.length || 1), p95: s[Math.floor(s.length * 0.95)] ?? 0,
        calls: renderer.info.render.calls, tris: renderer.info.render.triangles, dpr,
        angle: angle / STEP, drag: drag / STEP, progress, front,
      }
    },
    dispose() {
      running = false; cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', onDown)
      removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp)
      scene.traverse(o => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
        const mat = m.material as THREE.Material | THREE.Material[] | undefined
        ;(Array.isArray(mat) ? mat : mat ? [mat] : []).forEach(x => {
          const u = (x as THREE.ShaderMaterial).uniforms
          u?.map?.value?.dispose?.()
          x.dispose()
        })
      })
      env.dispose(); pmrem.dispose(); rt.dispose(); composer.dispose(); renderer.dispose()
    },
  }
}
