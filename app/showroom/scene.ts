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
  /** Show only these cars (indices into cards), or the whole stock (null) */
  setView: (ids: number[] | null, instant?: boolean) => void
  /** where a card's photo is on screen (css px, and its corner radius), while it is on show */
  cardRect: (ci: number) => { x: number; y: number; w: number; h: number; r: number } | null
  /** draws (if needed) the faces the first view of these cards needs; true once
   *  all are drawn and on the GPU — a walk started then births nothing */
  prepare: (ids: number[]) => boolean
  /** the cards step out of the hall (a person is open over it) or come back */
  hideCards: (on: boolean) => void
  /** The screen's edges the cards keep clear of (css px): the bar above, the search below, the sides */
  setInsets: (top: number, bottom: number, side: number) => void
  /** inside, with the cards out: up and down is theirs */
  inside: () => boolean
  /** the clock was tapped: the list goes back to its top */
  toTop: () => void
  /** a native page scroller drives the list: its position, in rows */
  setScroll: (rows: number) => void
  /** the native scroller, read once per frame (null while it is off): the
   *  cards then move in even steps, in time with the drawing */
  setScrollSource: (read: () => number | null) => void
  /** a tap at a screen point (from the native scroller): opens the card there */
  tapAt: (x: number, y: number) => void
  atTop: () => boolean
  /** a wheel turn inside; false: it was a pull out at the top */
  wheel: (dy: number) => boolean
  resize: () => void
  /** Offline rendering: place the camera at p and draw one frame now */
  renderFrame: (p: number) => void
  dispose: () => void
  stats: () => { frames: number; avg: number; p95: number; calls: number; tris: number; dpr: number; angle: number; drag: number; progress: number; front: number; born: number; walk?: { throwK: number; walkU: number; mapped: boolean; wallOn: boolean; exitRide: boolean } }
}

// A card on the floating gallery: one of the site's destinations. One image
// = a photo card, several = a mosaic, none = a typographic card.
export type Card = {
  title: string; sub: string; href: string; external?: boolean; images: string[]
  /** the car's own fields, for search: maker, model, year, price, in stock */
  make?: string; model?: string; year?: string; price?: string; stock?: boolean; km?: string; yad?: string
  /** for the advanced filter: fuel/engine (petrol, diesel, hev, phev, bev), body type, monthly payment, and the listing's number (newest = highest) */
  fuel?: string; body?: string; monthly?: number; rec?: number
  /** horsepower and electric range in km (0: not known) */
  hp?: number; ev?: number
  /** a member of the team, not a car: the face carries the name (title) and role (sub) */
  person?: boolean
  /** a person's sharp portrait for their page (the card carries the small copy) */
  hero?: string
}
type Opts = {
  mobile: boolean; logoUrl: string; cards: Card[]; font: string
  onFront: (i: number) => void
  /** inside, at the top of the list: how far the pull out has gone (1: let go to leave) */
  onPull?: (k: number) => void
  /** the pull at the top was let go past its mark: walk out */
  onExit?: () => void
  /** the list's scroll length changed (css px past one view, px per row); reset: back to its top */
  onScrollInfo?: (maxPx: number, rowPx: number, reset: boolean) => void
  /** the street gallery: the agency's own history, shown on the big screens outside */
  street?: Card[]
  /** a trial: a bright theme — at the end of the walk in, the whole hall comes up bright to carry it */
  light?: boolean
  veil?: number
  /** TRIAL (/showroom?walk=fold): instead of the scatter, the street's screens
   *  close back into the hall first, you walk in, and only then the grid opens
   *  — fewer things in flight at once */
  walk?: 'fold'
  onOpen: (i: number) => void
  /** the dark middle screen was tapped from the street: switch on and walk in */
  onEnter?: () => void
  /** where the sign on the building lands on screen (css px: centre, width) */
  /** fade: 1 in the street, 0 once the canopy hides the sign from the walker */
  onSign?: (x: number, y: number, w: number, fade: number) => void
  /** screen height (css px) of the front card's centre, for the arrows beside it */
  onGallery?: (y: number, x: number) => void
  /** every texture of the opening view has loaded: show the canvas */
  onReady?: () => void
  /** Offline rendering: no loop, fixed pixel ratio, full-resolution reflections */
  manual?: boolean
  dpr?: number
  /** cards whose faces are drawn ahead in idle time too (the team), so a walk
   *  in straight to them births nothing */
  preload?: number[]
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
  // the shader error checks read the GPU's logs, which makes the browser wait
  // for every compile right there in the frame: a debugging aid only
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== 'production'
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
    // mirror-smooth but barely reflective: at intensity 3 the studio environment's
    // light boxes mirrored in the panes as a pale band across the glass, read as a
    // stray line under the hall's ceiling
    glass: new THREE.MeshStandardMaterial({ color: '#6f8496', roughness: 0.04, metalness: 1, transparent: true, opacity: 0.14, envMapIntensity: 0.55, depthWrite: false }),
    // matte surfaces take their light from the room's own lights, as in the live
    // version; the environment photo is only for the glossy ones
    ceiling: new THREE.MeshStandardMaterial({ color: '#c9c6c0', roughness: 0.95, envMapIntensity: 0.25 }),
    // the hall's walls take their light only from its own (symmetric) downlights
    wall: new THREE.MeshStandardMaterial({ map: wallTex(6), roughness: 0.85, envMapIntensity: 0.08 }),
  }

  const flat = new THREE.Scene(); flat.background = new THREE.Color(1, 1, 1)
  const flatEnv = pmrem.fromScene(flat).texture
  // THE WHITE HAZE, found by A/B: the glass front mirrored the studio
  // environment's bright overhead "sky box"; looking up on the way in, the
  // transom pane over the doors showed it as a soft white blot. The glass
  // takes the flat, even fill instead: a sheen with nothing to mirror
  mats.glass.envMap = flatEnv; mats.glass.envMapIntensity = 0.3
  mats.wall.envMap = flatEnv   // walls: one even fill from every side, no tone jump at the corners
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
    roughness: 0.85, emissiveMap: stoneTex, emissive: new THREE.Color('#5a4c3c'), emissiveIntensity: 0.42,   // a shade darker: the lit sign stands out
  }))
  // the stone comes down to the canopy's edge: stone, then the soffit, then the glass
  stone.position.set(0, H + 17, FRONT + CANOPY); scene.add(stone)
  // canopy soffit: dark grey panels over the pavement, catching the shop light
  const soffitTex = canvasTex(512, 256, c => {
    c.fillStyle = '#2b2e31'; c.fillRect(0, 0, 512, 256); noise(c, 512, 256, 8)
    c.fillStyle = 'rgba(0,0,0,.6)'; for (let x = 0; x <= 512; x += 128) c.fillRect(x - 2, 0, 3, 256)
  }, [(W + 16) / 3, 1])
  // matte and without reflections: seen from below at a grazing angle, the studio
  // environment's glare on it showed as a white haze over the doors
  const soffit = new THREE.Mesh(new THREE.PlaneGeometry(W + 16, CANOPY), new THREE.MeshStandardMaterial({ map: soffitTex, roughness: 0.95, envMap: env, envMapIntensity: 0 }))
  // THE LINE: the soffit floated 4 cm above the glass head, leaving an open
  // slit across the whole front; through it the bright ceiling showed untinted.
  // Flat and 1 cm below the glass head, it seals the junction
  soffit.rotation.x = Math.PI / 2; soffit.position.set(0, H - 0.01, FRONT + CANOPY / 2); scene.add(soffit)
  box(4, H, 0.6, mats.metal, -half - 2, H / 2, FRONT - 0.3)
  box(4, H, 0.6, mats.metal, half + 2, H / 2, FRONT - 0.3)

  // ─── Glass street front: mullions every 2.5 m, sliding doors in the middle ───
  const glassH = H
  for (let x = -half; x <= half + 0.01; x += 2.5) {
    if (Math.abs(x) < 0.01) continue   // the doors open here: nothing to walk through
    box(0.09, glassH, 0.14, mats.metal, x, glassH / 2, FRONT)
  }
  // (no top rail across the glass: it cut the view as a line at ceiling height)
  box(W, 0.06, 0.16, mats.metal, 0, 0.03, FRONT)
  for (let x = -half + 1.25; x < half; x += 2.5) {
    if (Math.abs(x) < 1.3) continue // door bay
    const g = new THREE.Mesh(new THREE.PlaneGeometry(2.4, glassH), mats.glass)
    g.position.set(x, glassH / 2, FRONT); scene.add(g)
  }
  // fixed panes beside the sliding leaves (the leaves park over them)
  for (const sx of [-1, 1]) {
    // full height: a pane topping out at 2.7 left its edge as a faint line
    // beside the header, all the way to the mullions
    const fp = new THREE.Mesh(new THREE.PlaneGeometry(1.3, glassH), mats.glass)
    fp.position.set(sx * 1.85, glassH / 2, FRONT); scene.add(fp)
  }
  // transom glass only over the door gap, its bottom edge hidden inside the header
  box(2.4, glassH - 2.78, 0.02, mats.glass, 0, 2.78 + (glassH - 2.78) / 2, FRONT)
  const doors: THREE.Mesh[] = []
  // the leaves get their own, slightly more present glass, so the two panels
  // are seen sweeping aside instead of being all but invisible
  const doorGlass = new THREE.MeshStandardMaterial({ color: '#7e92a4', roughness: 0.04, metalness: 1, transparent: true, opacity: 0.26, envMapIntensity: 0.3, depthWrite: false })
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.7), doorGlass)
    d.position.set(s * 0.6, 1.35, FRONT + 0.04); scene.add(d); doors.push(d)
    const frame = box(0.05, 2.7, 0.06, mats.metal, s * 1.2, 1.35, FRONT + 0.04)
    d.userData.frame = frame
  }
  box(2.5, 0.1, 0.16, mats.metal, 0, 2.75, FRONT + 0.02)   // the doors' own header, as it was

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
  // (no lamps of its own: four more lights on every lit pixel cost the walk its
  // smoothness on a phone, for a glow the sign's own halo already gives)
  const washFrag = 'uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; void main(){ vec2 p = abs(vUv - .5) * 2.; float a = (1. - smoothstep(.62, 1., p.x)) * (1. - smoothstep(.1, 1., p.y)); gl_FragColor = vec4(uColor, a * a * uOpacity); }'
  const signWash = new THREE.Mesh(new THREE.PlaneGeometry(signW * 1.45, 2.2), new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#fff0de') }, uOpacity: { value: 0.1 } },
    vertexShader: radialVert, fragmentShader: washFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }))
  signWash.position.set(0, SIGN_Y, SIGN_Z + 0.005); scene.add(signWash)   // the sign's glow on the stone
  // the stone right behind the letters a shade darker, fading out past their
  // ends, so the lit sign stands out without darkening the whole facade
  // a wide, soft-edged shade (a gaussian, no visible border)
  const shadeFrag = 'uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; void main(){ vec2 p = (vUv - .5) * 2.; float a = exp(-(p.x * p.x * 2.2 + p.y * p.y * 3.2)) - exp(-5.4); gl_FragColor = vec4(uColor, max(a, 0.) * uOpacity); }'
  const signShade = new THREE.Mesh(new THREE.PlaneGeometry(signW * 2.1, 2.6), new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#000000') }, uOpacity: { value: 0.32 } },
    vertexShader: radialVert, fragmentShader: shadeFrag, transparent: true, depthWrite: false,
  }))
  signShade.position.set(0, SIGN_Y, SIGN_Z + 0.003); scene.add(signShade)
  // its light on the stone comes up with the letters (the page brings them
  // on 200 ms after the view is ready, over a second: the same beat)
  let signOnK = 0
  const signLight = (k: number) => { signOnK = k }
  // the street side is lit already when the page opens: only the hall's lights run
  const signL = new THREE.Vector3(), signR = new THREE.Vector3()
  let viewW = canvas.clientWidth, viewH = canvas.clientHeight
  const reportSign = () => {
    if (!opts.onSign) return
    signL.set(-signW / 2, SIGN_Y, SIGN_Z).project(camera); signR.set(signW / 2, SIGN_Y, SIGN_Z).project(camera)
    const cw = viewW, ch = viewH   // cached on resize: reading layout every frame forced a reflow each time
    // THE HAZE: the wash and shade painted on the stone live in the scene, so
    // walking up they swelled to fill the frame as a white blob long after the
    // letters had faded. They die away while the sign is still well ahead
    const near = fit(camera.position.z, SIGN_Z + 4, SIGN_Z + 7)
    ;(signWash.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.12 * signOnK * near
    ;(signShade.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.32 * near
    // as you come under the canopy its edge hides the sign: the page's sign (drawn
    // over the scene, so it knows nothing of that) fades out before its glow could show
    const fade = signL.z < 1 && signR.z < 1 ? fit(camera.position.z, SIGN_Z + 0.6, SIGN_Z + 3.2) : 0
    opts.onSign(((signL.x + signR.x) / 4 + 0.5) * cw, (0.5 - (signL.y + signR.y) / 4) * ch, (signR.x - signL.x) / 2 * cw, fade)
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
  // the canopy's own downlights, outside: on from the start (the hall's are
  // off); theirs is the light on the pavement
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#ffd9b0') } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float y = clamp(vUv.y, 0., 1.); float a = pow(y, 3.) * (1. - smoothstep(.8, 1., y)) * edge * .06; gl_FragColor = vec4(uColor, a); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  })
  for (const x of [-3.75, 3.75]) {
    const disc = new THREE.Mesh(spotGeo, spotMat); disc.rotation.x = Math.PI / 2; disc.position.set(x, H + 0.035, FRONT + 1.2); scene.add(disc)
    // the light falling from it: a faint cone that fades out well before the
    // ground and at its edges (no real light here: its cone drew a hard,
    // broken edge on the pavement; the street's soft pool below carries it)
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 1.7, H - 0.06, 48, 1, true), beamMat)   // open at the top: as wide as the lamp, no point
    beam.position.set(x, (H - 0.06) / 2, FRONT + 1.2); scene.add(beam)
  }
  // the light on the street, as before: one soft pool in front of the window
  glow('light', 22, 9, 0, FRONT + 3.2, 0.01, 0.3, '#ffd2a0')
  const spotC = new THREE.Color()
  spots.forEach(([, z], i) => power(depthDelay(z), k => {
    spotMesh.setColorAt(i, spotC.setScalar(0.03 + 0.97 * k)); spotMesh.instanceColor!.needsUpdate = true
  }))

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
  const edgeFrag = 'uniform float uOpacity; varying vec2 vUv; void main(){ float a = pow(max(1. - vUv.y, 0.), 2.2);   /* max: a base a hair below 0 at the edge gave NaN, drawn as black dashes */ gl_FragColor = vec4(0., 0., 0., a * uOpacity); }'
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
    power(depthDelay(z), k => { l.intensity = 5 * k })
  }
  // night sky light from straight in front: it lights the facade evenly and
  // falls on neither inner wall more than the other
  // light bouncing up off the floor onto the ceiling (only faces looking down catch it)
  const bounce = new THREE.DirectionalLight('#ffe2c6', 0.9); bounce.position.set(0, -10, -12); bounce.target.position.set(0, 0, -12); scene.add(bounce, bounce.target)
  power(0.05, k => { scallopMat.uniforms.uOpacity.value = 0.32 * k }, 0.35)
  // the hall's own surfaces take the soft fill from their own copy of the
  // environment, so it can go dark with the lights while the street keeps its own
  const tileMat = tile.material as THREE.MeshStandardMaterial
  // THE WHITE HAZE: with the studio environment on the ceiling, its big
  // overhead light box reflected as a huge soft white blot mid-ceiling on
  // the way in. The ceiling takes the flat, even fill instead
  mats.ceiling.envMap = flatEnv; tileMat.envMap = env
  power(0, k => {
    mats.wall.envMapIntensity = 0.05 + 0.23 * k
    mats.ceiling.envMapIntensity = 0.06 + 0.29 * k
    tileMat.envMapIntensity = 0.26 + 0.09 * k    // the dark hall's floor stays readable, a clear step lighter than the mat
  }, 0.4)
  const moon = new THREE.DirectionalLight('#8ea6d6', 0.6); moon.position.set(0, 10, 14); scene.add(moon)

  // ─── The stand: one gloss plinth in the middle of the hall, a light ring at
  //     its edge, and the gallery hovering above it ───
  const STAND = new THREE.Vector3(0, 0, -12.5)
  const TOTAL = opts.cards.length
  // the cars on show (a search narrows it): indices into the cards, the front
  // one at `base`; N is how many there are
  let view: number[] = Array.from({ length: TOTAL }, (_, i) => i)
  let N = TOTAL, base = 0
  const carAt = (k: number) => (N ? view[(((k - base) % N) + N) % N] : -1)
  // outside, the screens carry the history gallery (indices past the stock)
  const S = opts.street?.length ?? 0
  const sAt = (k: number) => TOTAL + (((k % S) + S) % S)
  const onStreet = S > 0
  // a new set comes on like a change of channel: the screens dim, re-dress, light up
  let pendingView: number[] | null = null, swap = 0
  // card size (m), canvas 1024×832 — larger on a phone, where it must read at arm's length
  // 3:2 screens, as asked
  const CW = mobile ? 3.0 : 2.3, CH = CW * (2 / 3)
  // The ring grows with the number of cars: every card gets a clear gap of
  // 35% of its width on each side, so no two cars ever touch
  // the ring holds a fixed 8 slots; the stock streams through them
  // 6 slots: the neighbours stay in frame beside the front screen
  const SLOTS = Math.max(1, Math.min(6, TOTAL))
  const R = Math.max(3.0, (SLOTS * CW * 1.35) / (Math.PI * 2))
  const PR = R + 0.7                              // plinth radius
  // satin, not piano gloss: a mirror-bright edge caught the lamps as a stray streak by the ring
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR + 0.06, 0.08, 160), new THREE.MeshStandardMaterial({ color: '#070708', roughness: 0.45, metalness: 0 }))
  plinth.position.set(STAND.x, 0.04, STAND.z); scene.add(plinth)
  // the plinth's sheen comes from the hall's light: dark from the street with
  // the rest (lit by the street's sky alone it showed as a stray grey patch)
  const plinthMat = plinth.material as THREE.MeshStandardMaterial
  plinthMat.envMap = env
  power(depthDelay(STAND.z), k => { plinthMat.envMapIntensity = 0.03 + 0.32 * k })
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
  // dark from the street like the rest of the hall; it comes on with the lights
  power(depthDelay(STAND.z), k => { ringMat.uniforms.uColor.value.setRGB(2.2 * k, 1.95 * k, 1.6 * k) })
  const lightRing = new THREE.Mesh(new THREE.RingGeometry(PR - 0.1, PR + 0.16, 512, 1), ringMat)
  lightRing.rotation.x = -Math.PI / 2; lightRing.position.set(STAND.x, 0.083, STAND.z); scene.add(lightRing)
  glow('shadow', PR * 2.4, PR * 2.4, STAND.x, STAND.z, 0.003, 0.45)
  glow('light', PR * 2.6, PR * 2.6, STAND.x, STAND.z, 0.084, 0.42)   // the light on the plinth goes out with the hall

  // Back wall: the vertical black posts stay (they give the room its depth);
  // no frosted bands or glass between them
  for (const x of [-8, -4.8, -1.6, 1.6, 4.8, 8]) box(0.06, H, 0.08, mats.metal, x, H / 2, FRONT - D + 0.15)
  // ─── The gallery: cards bent along the ring. Each card is designed, not a
  //     pasted photo: the car's photograph in a rounded frame, a band with the
  //     model and price, a hairline edge. Unlit, so the photos keep their
  //     true colour; cards off the front dim and recede. ───
  const cards = [...opts.cards, ...(opts.street ?? [])]
  const STEP = (Math.PI * 2) / SLOTS
  const ARC = CW / R
  const cardGeo = new THREE.CylinderGeometry(R, R, CH, 24, 1, true, -ARC / 2, ARC)
  const cardVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`
  const cardFrag = `
    uniform sampler2D map; uniform float uDim; uniform float uAlpha; uniform float uReady; uniform float uPower; uniform float uFill; uniform float uExp; uniform float uCap; uniform float uSwap; uniform float uFade; uniform sampler2D map2; uniform float uMix; uniform vec2 uSize; varying vec2 vUv;
    float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
    // exact inverse of three's ACES filmic fit: the composer tone-maps the
    // whole frame at the end, so the screen pixels are pre-inverted here and
    // the photo lands on the glass exactly as authored
    vec3 odtInv(vec3 y){
      vec3 a = 1. - .983729 * y;
      vec3 b = .0245786 - .432951 * y;
      vec3 c = -(.000090537 + .238081 * y);
      return (-b + sqrt(max(b * b - 4. * a * c, 0.))) / (2. * a);
    }
    vec3 acesInv(vec3 col){
      mat3 invIn = mat3(1.76474, -.14703, -.03634, -.67578, 1.16025, -.16244, -.08896, -.01322, 1.19877);
      mat3 invOut = mat3(.64304, .05927, .00596, .31119, .93144, .06393, .04578, .00929, .93012);
      return invIn * odtInv(clamp(invOut * col, vec3(0.), vec3(.995))) * (.6 / max(uExp, .001));
    }
    void main(){
      vec2 p = (vUv - .5) * uSize;
      float d = rbox(p, uSize * .5, .055);
      float a = 1. - smoothstep(-.004, .002, d);
      // uFill < 1 leaves a bezel of dark screen around the photo
      vec2 mu = (vUv - .5) / uFill + .5;
      float inPic = step(0., mu.x) * step(mu.x, 1.) * step(0., mu.y) * step(mu.y, 1.);
      vec3 ph = mix(texture2D(map, clamp(mu, 0., 1.)).rgb, texture2D(map2, clamp(mu, 0., 1.)).rgb, uMix);
      vec3 col = mix(vec3(.075, .078, .085), ph, uReady * inPic);
      // switched on like a screen: the picture opens out of a bright line
      // across the middle, with a flash, then settles
      float open = smoothstep(0., .55, uPower);
      float pic = step(abs(vUv.y - .5), open * .5 + .004) * step(.001, uPower);
      col = mix(vec3(.018, .019, .022), col + (1. - smoothstep(.35, 1., uPower)) * .6, pic);
      col = mix(col, vec3(.018, .019, .022), uSwap);      // mid-change, the glass goes dark
      col *= mix(1., .28, uDim);                          // cards away from the front recede
      col = min(acesInv(max(col, vec3(0.))), vec3(uCap)); // capped where bloom runs, so white photos don't flare
      gl_FragColor = vec4(col, a * uAlpha * uFade);
      #include <colorspace_fragment>
    }`
  const ring = new THREE.Group()
  ring.position.copy(STAND)
  scene.add(ring)
  const cardMeshes: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial>[] = []
  for (let i = 0; i < SLOTS; i++) {
    const m = new THREE.Mesh(cardGeo, new THREE.ShaderMaterial({
      uniforms: { map: { value: null }, uDim: { value: 0 }, uAlpha: { value: 0 }, uReady: { value: 0 }, uPower: { value: 0 }, uFill: { value: 1 }, uExp: { value: 1.05 }, uSwap: { value: 0 }, uFade: { value: 1 }, map2: { value: null }, uMix: { value: 0 }, uCap: { value: mobile ? 16.0 : 1.5 }, uSize: { value: new THREE.Vector2(CW, CH) } },
      vertexShader: cardVert, fragmentShader: cardFrag, transparent: true,
    }))
    // RTL: the next car waits on the left of the front card
    m.rotation.y = -i * STEP
    m.userData.slot = i; m.userData.car = -1
    ring.add(m); cardMeshes.push(m)
  }

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
  // The gallery IS the inventory: every card is one car, newest first, and
  // the ring is virtual — a fixed set of screens re-dressed as you browse,
  // so the whole stock fits however long it is. Textures stream in and the
  // farthest are let go
  // textures go to the GPU one per frame, off the showing path, so a burst
  // of births never lands in one frame
  const uploadQ: THREE.Texture[] = []
  let born = 0
  const texCache = new Map<number, { tex: THREE.CanvasTexture; ready: boolean; used: number }>()
  const ensureTex = (ci: number) => {
    let e = texCache.get(ci)
    if (e) return e
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 853
    const c = cv.getContext('2d')!
    c.fillStyle = '#121316'; c.fillRect(0, 0, 1280, 853)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
    e = { tex, ready: false, used: time }; texCache.set(ci, e); born++
    const src = cards[ci]?.images[0]
    const done = (im: HTMLImageElement | null) => {
      if (im) cover(c, im, 0, 0, 1280, 853, cards[ci]?.person ? 0 : 0.5)
      else {   // no photo: the quiet brand mark
        const gr = c.createLinearGradient(0, 0, 1280, 853)
        gr.addColorStop(0, '#1c1f24'); gr.addColorStop(1, '#0e0f12')
        c.fillStyle = gr; c.fillRect(0, 0, 1280, 853)
      }
      tex.needsUpdate = true; uploadQ.push(tex); e!.ready = true; dirty = true
    }
    if (src) loadImg(src).then(im => done(im as HTMLImageElement | null))
    else loadImg(opts.logoUrl).then(im => {
      done(null)
      const lg = im as HTMLImageElement | null
      if (lg) { const w = 520, h = w * (lg.naturalHeight / lg.naturalWidth); c.globalAlpha = 0.5; c.drawImage(lg, (1280 - w) / 2, (853 - h) / 2, w, h); c.globalAlpha = 1; tex.needsUpdate = true }
    })
    if (texCache.size > 14) {   // drop the car shown longest ago (never one on a screen)
      let worst = -1, wd = Infinity
      const onScreen = new Set(cardMeshes.map(m => m.userData.car as number))
      texCache.forEach((v, k) => { if (k !== ci && !onScreen.has(k) && v.used < wd) { wd = v.used; worst = k } })
      const w = texCache.get(worst)
      if (w) { w.tex.dispose(); texCache.delete(worst) }
    }
    return e
  }
  let loaded = false
  const loadCards = () => {
    if (loaded) return
    loaded = true
    if (S) { ensureTex(sAt(0)); if (S > 1) { ensureTex(sAt(1)); ensureTex(sAt(-1)); ensureTex(sAt(2)) }; return }
    if (!N) return
    ensureTex(carAt(0))
    if (N > 1) { ensureTex(carAt(1)); ensureTex(carAt(-1)); ensureTex(carAt(2)) }
  }

  // ─── The screens and the cards, drawn over the hall (after its bloom and
  //     blur, so they stay crisp). A beat after the screens light up they
  //     grow out of the hall and stand big in front of you — the ring as
  //     seen from the hall's middle, carried with you. Walking in, they go in
  //     with you; once inside, the three facing you scatter into the stock:
  //     one card a row, the middle one whole, the ones before and after it
  //     showing above and below; up and down runs through the whole stock ───
  const wallScene = new THREE.Scene()
  const WALL_R = 3                      // the cards' distance from you (m)
  // a card's face, in canvas pixels: on a phone a card is ~350 device pixels
  // wide (the pixel ratio is capped at 2), so 512 keeps it sharp at a little
  // over half the GPU memory and upload of 768 — every card entering the list
  // is uploaded mid-scroll
  const CARD_PX = mobile ? 512 : 768
  let STRIP = 0.26                      // its info band, as a share of its width (set by layout)
  const calm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const wallFrag = `
    uniform sampler2D map; uniform sampler2D map2; uniform float uFlip; uniform sampler2D pillMap; uniform float uPill; uniform vec4 uPillR; uniform float uAlpha; uniform float uReady; uniform float uExp; uniform float uLift; uniform vec2 uSize; uniform float uPad;
    uniform float uStrip; uniform float uStripH; uniform float uBright; uniform vec3 uClip; uniform float uClipOn; uniform vec3 uBase; uniform vec3 uEdgeC; uniform float uEdgeK; uniform float uShade; uniform float uRad; varying vec2 vUv;
    float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
    vec3 odtInv(vec3 y){
      vec3 a = 1. - .983729 * y;
      vec3 b = .0245786 - .432951 * y;
      vec3 c = -(.000090537 + .238081 * y);
      return (-b + sqrt(max(b * b - 4. * a * c, 0.))) / (2. * a);
    }
    vec3 acesInv(vec3 col){
      mat3 invIn = mat3(1.76474, -.14703, -.03634, -.67578, 1.16025, -.16244, -.08896, -.01322, 1.19877);
      mat3 invOut = mat3(.64304, .05927, .00596, .31119, .93144, .06393, .04578, .00929, .93012);
      return invIn * odtInv(clamp(invOut * col, vec3(0.), vec3(.995))) * (.6 / max(uExp, .001));
    }
    void main(){
      vec2 p = (vUv - .5) * (uSize + 2. * uPad);
      // the band under the photo opens as a screen becomes a card
      float hv = uSize.y - uStripH * (1. - uStrip);
      vec2 c = vec2(0., (uSize.y - hv) * .5);
      float d = rbox(p - c, vec2(uSize.x, hv) * .5, uRad);
      float aa = max(fwidth(d), 1e-5);
      float inCard = 1. - smoothstep(-aa, aa, d);
      vec2 uv = clamp(p / uSize + .5, 0., 1.);
      // Mid-flight the card is a turning screen: before the half-way it
      // shows its screen's photo, after it the car. THE OLD FAULT: the
      // screen's 3:2 photo was stretched over the card's taller quad; it is
      // sampled now only across the card's own photo region — exactly 3:2 —
      // so the picture is true from the first frame to the last
      float m2y = clamp((p.y + uSize.y * .5 - uStripH) / max(uSize.y - uStripH, 1e-4), 0., 1.);
      vec3 ph = (uFlip > .5) ? texture2D(map2, vec2(uv.x, m2y)).rgb : texture2D(map, uv).rgb;
      vec3 col = mix(uBase, ph, uReady) * uBright;
      // the status pill, its own layer on the photo's corner (uPillR: its box
      // in card space — left, bottom, width, height)
      vec2 pq = (p - uPillR.xy) / uPillR.zw;
      if (uPill > .001 && pq.x >= 0. && pq.x <= 1. && pq.y >= 0. && pq.y <= 1.) {
        vec4 pc = texture2D(pillMap, pq);
        col = mix(col, pc.rgb, pc.a * uPill);
      }
      // a hairline of light at the edge, like the screens' (brighter under the hand)
      col = mix(col, uEdgeC, (1. - smoothstep(0., 1.6 * aa, abs(d + aa))) * (uEdgeK + .16 * uLift));
      col = acesInv(max(col, vec3(0.)));   // the photo exactly as it is (the frame is tone-mapped after)
      // a soft shadow around the card lifts it off the hall
      float sh = (1. - smoothstep(0., uPad, d)) * uShade * (1. - inCard);
      // kept clear of the bar above and the search below: faded at those lines
      float fy = gl_FragCoord.y;
      float clip = mix(1., smoothstep(uClip.x, uClip.x + uClip.z, fy) * (1. - smoothstep(uClip.y - uClip.z, uClip.y, fy)), uClipOn);
      gl_FragColor = vec4(col * inCard, (inCard + sh) * uAlpha * clip);
      #include <colorspace_fragment>
    }`
  // the screens' twins: the very same screens (same material, so the same
  // car, light and dimming), flat, drawn over the hall
  const showGeo = new THREE.PlaneGeometry(CW, CH)
  const showMeshes = cardMeshes.map(m => { const sm = new THREE.Mesh(showGeo, m.material); sm.visible = false; sm.userData.slot = m.userData.slot; wallScene.add(sm); return sm })
  const showP = cardMeshes.map(() => new THREE.Vector3()), showQ = cardMeshes.map(() => new THREE.Quaternion())
  // the ring screens' true world poses, and how much of the street twins remains
  const ringP = cardMeshes.map(() => new THREE.Vector3()), ringQ = cardMeshes.map(() => new THREE.Quaternion())
  let showK = 0
  const slotDim = cardMeshes.map(() => 0)
  const wallGeo = new THREE.PlaneGeometry(1, 1)
  // a pool of card meshes; each car on show holds one while it is there
  const allMeshes: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = []
  const freeMeshes: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = []
  let zoneH = 1, gapM = 0.02
  let cardW = 1.6, cardH = 1.5, pitch = 1.6, pitchPx = 300, cardCss = 170, gridTop = 1, colX = 0.9, rowsFit = 2, wideFace = false, gcols = 2
  let insetTop = 80, insetBottom = 170, insetSide = 16
  const dress = (m: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>) => {
    const u = m.material.uniforms, pad = cardW * 0.07
    u.uSize.value.set(cardW, cardH); u.uPad.value = pad; u.uStripH.value = cardW * STRIP
    const h = viewH || canvas.clientHeight
    u.uClip.value.set(insetBottom * dpr, (h - insetTop) * dpr, 6 * dpr)   // a short, soft fade exactly at the dividing lines
  }
  const takeMesh = () => {
    const f = freeMeshes.pop()
    if (f) return f
    const m = new THREE.Mesh(wallGeo, new THREE.ShaderMaterial({
      uniforms: {
        map: { value: null }, map2: { value: null }, uFlip: { value: 0 }, pillMap: { value: null }, uPill: { value: 0 }, uPillR: { value: new THREE.Vector4(0, 0, 1, 1) }, uRad: { value: 0.04 }, uAlpha: { value: 0 }, uReady: { value: 0 }, uExp: { value: 1 }, uLift: { value: 0 },
        uSize: { value: new THREE.Vector2(1, 1) }, uPad: { value: 0.05 }, uStrip: { value: 1 }, uStripH: { value: 0.3 },
        uBright: { value: 1 }, uClip: { value: new THREE.Vector3(0, 1e5, 1) }, uClipOn: { value: 1 },
        uBase: { value: new THREE.Color(opts.light ? '#e9ecef' : '#0d0e11') }, uEdgeC: { value: new THREE.Color(opts.light ? '#000000' : '#ffffff') },
        uEdgeK: { value: opts.light ? 0.06 : 0.14 }, uShade: { value: 0.4 },
      },
      vertexShader: cardVert, fragmentShader: wallFrag, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    }))
    m.visible = false; m.userData.car = -1
    dress(m); wallScene.add(m); allMeshes.push(m)
    return m
  }
  showMeshes.forEach(sm => { sm.visible = true })
  const warm = takeMesh(); warm.visible = true
  renderer.compile(wallScene, camera)
  showMeshes.forEach(sm => { sm.visible = false }); warm.visible = false; freeMeshes.push(warm)
  // A car on show: its mesh, its place in the list (pi, eased — so a filter
  // moves it softly to its new place) and vis: in (1) or on its way out (0)
  type Held = { m: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>; car: number; i: number; pr: number; pc: number; vis: number; live: boolean }
  const held = new Map<number, Held>()
  let scrollPos = 0, scrollTarget = 0, holding = false, wallOn = false, hovered: THREE.Object3D | null = null
  let walkDir = 1, lastP = 0, walkU = 0, lastWalkU = 0
  let scrollAt = -1e9, infoKey = '', infoReset = false
  let throwK = 0, growAt = -1, viewChanged = false, exitRide = false, mapped = false, listStart = 0, anchor = 1, r0m = 0, wasFull = false
  // a tapped card flies up to you, filling the screen, and its page opens
  let opening: { h: Held; t: number; fired: boolean } | null = null
  const layCam = new THREE.PerspectiveCamera()
  const invLay = new THREE.Matrix4(), layQi = new THREE.Quaternion(), xAxis = new THREE.Vector3(1, 0, 0), yUp = new THREE.Vector3(0, 1, 0)
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion()
  const srcP = new THREE.Vector3(), srcQ = new THREE.Quaternion(), endP = new THREE.Vector3(), endQ = new THREE.Quaternion()
  const GROW_MS = 900
  const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
  const mod = (a: number, n: number) => ((a % n) + n) % n
  const listCar = (i: number) => (N ? view[mod(listStart + i, N)] : -1)
  // All three screens you see turn into cards, each to its own cell, on
  // paths that never cross. A screen shows a history photo and turns into
  // whichever car it is given, so places are chosen for the paths: the
  // middle screen becomes the first card (top right, where reading starts),
  // the left screen the second (top left), the right screen the third (the
  // next row's right) — middle and left rise, right sinks; none cross.
  // rel: the screen (0 middle, +1 left, -1 right); at: its place in the list
  const FLY = [{ rel: 0, at: 0, o: 0 }, { rel: 1, at: 1, o: 0.06 }, { rel: -1, at: 2, o: 0.12 }]
  // the fold trial: the walk's own time (walkU) as one continuous motion,
  // nothing faded, only moved — 0→FOLD_IN the big screens close back onto
  // the stand along the path they grew out on; you walk in; from FOLD_OPEN
  // the three screens facing you glide on from the stand into the grid's
  // first cells (turning over on the way), the rest of the grid rises from
  // below as one block out from behind the foot's line, and the stand's other
  // screens sink into it — all landing together
  const FOLD = opts.walk === 'fold'
  const FOLD_IN = 0.38, FOLD_OPEN = 0.5
  const flightE = (rel: number) => {
    if (calm) return throwK > 0 ? 1 : 0
    const o = FLY.find(f => f.rel === rel)?.o ?? 0
    if (FOLD) return easeInOut(fit(walkU, FOLD_OPEN + o * 0.5, 1))
    // the window ends at the very end: walking in they land together, and
    // walking out every one leaves the moment the walk turns
    return easeInOut(fit(throwK, o, 1))
  }
  const slotOf = (rel: number) => mod(r0m + rel, SLOTS)
  const sIdxK = (sIdx: number) => { const pos = angle / STEP; return sIdx + SLOTS * Math.round((pos - sIdx) / SLOTS) }
  const facingReady = () => {
    const r0 = Math.round(angle / STEP)
    for (let rel = -1; rel <= 1; rel++) { const c = cardMeshes[mod(r0 + rel, SLOTS)]?.userData.car; if (c >= 0 && !texCache.get(c)?.ready) return false }
    return true
  }
  const relOfSlot = (sIdx: number) => {
    if (!mapped) return null
    for (const f of FLY) {
      const li = anchor + f.at
      if (li >= 0 && li < N && slotOf(f.rel) === sIdx) return f.rel
    }
    return null
  }

  // The face of a card: the cars page's card, in the hall's dark. The photo
  // (3:2, untouched); under it the maker and the model in English, from the
  // left, and the price, year · km · hand and availability in Hebrew, from
  // the right — side by side on a wide card, one under the other on a narrow
  // one. Nothing is cut: the model takes two lines if it needs, and a line
  // that would not fit steps its type down a little
  // the face's palette: the hall's dark, or (the bright trial) the cars page's own
  const face = opts.light
    ? { bg: '#ffffff', ink: '#14171A', muted: '#5A6169', line: 'rgba(0,0,0,.08)', green: '#1F4D3A', gold: '#A8862F' }
    : { bg: '#111318', ink: '#ffffff', muted: 'rgba(255,255,255,.62)', line: 'rgba(255,255,255,.07)', green: '#7fcf9f', gold: '#d8b360' }
  const GREEN = face.green, GOLD = face.gold
  // The card, to the baseline of the best marketplace cards: the status as a
  // small pill on the photo's corner; under the photo the name (maker bold,
  // model after it, one flowing line that may wrap once), the PRICE as the
  // card's strongest line, and the facts as small line icons with their
  // values — a calendar for the year, a gauge for the km, a person for the
  // hand. One design in every size; the band is fixed in css px
  const BAND_CSS = 96, BAND_WIDE = 78
  // the status pill, its own layer: drawn once per status (in stock / on the
  // way) at 4x, laid on the photo's top corner by the card's shader, and shown
  // only once the card has landed — it never rides the scatter or the walk out
  const PILL_H = 19, PILL_S = 4
  const pills: Record<'stock' | 'way', { tex: THREE.CanvasTexture; w: number } | null> = { stock: null, way: null }
  const pillOf = (stock: boolean) => {
    const key = stock ? 'stock' : 'way'
    if (pills[key]) return pills[key]!
    const word = stock ? 'במלאי' : 'בדרך לארץ', font = opts.font
    const m = document.createElement('canvas').getContext('2d')!
    m.font = `600 ${10 * PILL_S}px ${font}`; m.direction = 'rtl'
    const w = m.measureText(word).width / PILL_S + 22
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w * PILL_S); cv.height = PILL_H * PILL_S
    const c = cv.getContext('2d')!, H = cv.height, W = cv.width
    c.fillStyle = opts.light ? 'rgba(255,255,255,.92)' : 'rgba(13,15,19,.8)'
    c.beginPath(); c.roundRect(0, 0, W, H, H / 2); c.fill()
    c.fillStyle = stock ? face.green : face.gold
    c.beginPath(); c.arc(W - 9 * PILL_S, H / 2, 2.6 * PILL_S, 0, Math.PI * 2); c.fill()
    c.fillStyle = face.ink; c.font = `600 ${10 * PILL_S}px ${font}`; c.direction = 'rtl'; c.textAlign = 'right'; c.textBaseline = 'middle'
    c.fillText(word, W - 15 * PILL_S, H / 2 + 0.5 * PILL_S)
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter
    pills[key] = { tex, w }
    return pills[key]!
  }
  // the facts' little icons, drawn as lines at (x right edge, baseline y), size s
  const icon = (c: CanvasRenderingContext2D, kind: 'year' | 'km' | 'hand', xr: number, yb: number, s: number, col: string) => {
    const x = xr - s, y = yb - s * 0.92
    c.save(); c.strokeStyle = col; c.lineWidth = Math.max(1, s * 0.11); c.lineCap = 'round'; c.lineJoin = 'round'
    c.beginPath()
    if (kind === 'year') {
      const r = s * 0.16
      c.moveTo(x + r, y + s * 0.14); c.lineTo(x + s - r, y + s * 0.14); c.quadraticCurveTo(x + s, y + s * 0.14, x + s, y + s * 0.14 + r)
      c.lineTo(x + s, y + s - r); c.quadraticCurveTo(x + s, y + s, x + s - r, y + s); c.lineTo(x + r, y + s); c.quadraticCurveTo(x, y + s, x, y + s - r)
      c.lineTo(x, y + s * 0.14 + r); c.quadraticCurveTo(x, y + s * 0.14, x + r, y + s * 0.14)
      c.moveTo(x, y + s * 0.4); c.lineTo(x + s, y + s * 0.4)
      c.moveTo(x + s * 0.3, y); c.lineTo(x + s * 0.3, y + s * 0.24); c.moveTo(x + s * 0.7, y); c.lineTo(x + s * 0.7, y + s * 0.24)
    } else if (kind === 'km') {
      const cx = x + s / 2, cy = y + s * 0.62, r = s * 0.48
      c.arc(cx, cy, r, Math.PI * 0.85, Math.PI * 2.15)
      c.moveTo(cx, cy); c.lineTo(cx + r * 0.55, cy - r * 0.55)
    } else {
      c.arc(x + s / 2, y + s * 0.3, s * 0.22, 0, Math.PI * 2)
      c.moveTo(x + s * 0.08, y + s); c.quadraticCurveTo(x + s / 2, y + s * 0.42, x + s * 0.92, y + s)
    }
    c.stroke(); c.restore()
  }
  const drawInfo = (c: CanvasRenderingContext2D, card: Card, y0: number) => {
    const Wc = CARD_PX, Hs = c.canvas.height - y0, k = Wc / cardCss
    const px = (v: number) => v * k, font = opts.font
    const pad = px(11), maxW = Wc - pad * 2

    // (the status pill is not baked into the face: it is its own layer, so it
    // never flies with the card — see pillTex)
    c.fillStyle = face.bg; c.fillRect(0, y0, Wc, Hs)
    c.textBaseline = 'alphabetic'

    // a person: the name and, under it, the role — Hebrew, from the right,
    // centred in the band (no empty white under a short role)
    if (card.person) {
      const fit1 = (t: string, weight: number, size: number, lines: number) => {
        let f = size, out: string[] = []
        for (; f >= 10; f -= 0.5) {
          c.font = `${weight} ${px(f)}px ${font}`; out = []
          for (const w of t.split(/\s+/).filter(Boolean)) {
            const cur = out[out.length - 1]
            if (cur !== undefined && c.measureText(cur + ' ' + w).width <= maxW) out[out.length - 1] = cur + ' ' + w
            else out.push(w)
          }
          if (out.length <= lines && out.every(l => c.measureText(l).width <= maxW)) break
        }
        return { f, lines: out.slice(0, lines) }
      }
      c.direction = 'rtl'; c.textAlign = 'right'
      const nm = fit1(card.title, 600, 15, 1), rl = card.sub ? fit1(card.sub, 400, 12.5, 2) : { f: 12.5, lines: [] as string[] }
      const textH = px(nm.f * 1.25) + rl.lines.length * px(rl.f * 1.34)
      let y = y0 + Math.max(px(6), (Hs - textH) / 2 - px(2)) + px(nm.f)
      c.font = `600 ${px(nm.f)}px ${font}`; c.fillStyle = face.ink; c.fillText(nm.lines.join(' '), Wc - pad, y)
      c.font = `400 ${px(rl.f)}px ${font}`; c.fillStyle = face.muted
      for (const l of rl.lines) { y += px(rl.f * 1.34); c.fillText(l, Wc - pad, y) }
      c.direction = 'ltr'; c.textAlign = 'left'
      return
    }

    // the name: maker bold, model regular, wrapped to at most two lines;
    // the type steps down a little before anything would be cut
    const words = [
      ...(card.make ?? card.title).split(/\s+/).filter(Boolean).map(t => ({ t, b: true })),
      ...(card.model ?? '').split(/\s+/).filter(Boolean).map(t => ({ t, b: false })),
    ]
    const wrap = (fs: number) => {
      const lines: { t: string; b: boolean }[][] = [[]]
      let w = 0
      for (const wd of words) {
        c.font = `${wd.b ? 600 : 400} ${fs}px ${font}`
        const ww = c.measureText(wd.t).width, sp = c.measureText(' ').width
        if (lines[lines.length - 1].length && w + sp + ww > maxW) { lines.push([]); w = 0 }
        w += (lines[lines.length - 1].length ? sp : 0) + ww
        lines[lines.length - 1].push(wd)
      }
      return lines
    }
    let fn = 12.5, lines = wrap(px(fn))
    const maxLines = Hs / k < 90 ? 1 : 2   // the low band (wide cards) keeps the name to one line
    while (lines.length > maxLines && fn > 10) { fn -= 0.5; lines = wrap(px(fn)) }
    c.direction = 'ltr'; c.textAlign = 'left'
    let y = y0 + px(10) + px(fn)
    for (const line of lines) {
      let x = pad
      line.forEach((wd, n) => {
        c.font = `${wd.b ? 600 : 400} ${px(fn)}px ${font}`
        c.fillStyle = wd.b ? face.ink : face.muted
        const t = (n ? ' ' : '') + wd.t
        c.fillText(t, x, y); x += c.measureText(t).width
      })
      y += px(fn * 1.3)
    }

    // the facts, the band's last line: icon + value, right to left
    const facts: { k: 'year' | 'km' | 'hand'; v: string }[] = []
    if (card.year) facts.push({ k: 'year', v: card.year })
    // "new" once: not again for the km when the year or the hand already says so
    const newHand = /חדש/.test(card.yad ?? '')
    const newKm = /חדש/.test(card.km ?? '')
    if (card.km && !(newKm && (/חדש/.test(card.year ?? '') || newHand))) facts.push({ k: 'km', v: card.km })
    if (card.yad) facts.push({ k: 'hand', v: newHand ? 'חדש' : `יד ${card.yad}` })
    const GAP = 12, ICON = 11, IG = 4
    const factsW = (fs: number) => facts.reduce((a, f, n) => {
      c.direction = f.k === 'hand' ? 'rtl' : 'ltr'; c.font = `500 ${px(fs)}px ${font}`
      return a + px(ICON + IG) + c.measureText(f.v).width + (n ? px(GAP) : 0)
    }, 0)
    let ff = 11
    while (factsW(ff) > maxW && ff > 9) ff -= 0.5
    const yFacts = y0 + Hs - px(10)
    let fx = Wc - pad
    c.textAlign = 'right'
    facts.forEach((f, n) => {
      if (n) fx -= px(GAP)
      icon(c, f.k, fx, yFacts, px(ICON * ff / 11), face.muted)
      fx -= px(ICON + IG)
      c.direction = f.k === 'hand' ? 'rtl' : 'ltr'; c.font = `500 ${px(ff)}px ${font}`; c.fillStyle = face.ink
      c.fillText(f.v, fx, yFacts); fx -= c.measureText(f.v).width
    })

    // the price: the card's strongest line, right above the facts
    if (card.price) {
      const yPrice = yFacts - px(ff * 1.25) - px(7)
      c.direction = 'ltr'; c.textAlign = 'right'; c.font = `700 ${px(16)}px ${font}`; c.fillStyle = face.ink
      c.fillText(card.price, Wc - pad, yPrice)
    }
    c.direction = 'ltr'; c.textAlign = 'left'
  }
  const wallCache = new Map<number, { tex: THREE.CanvasTexture; ready: boolean; used: number }>()
  const ensureCard = (ci: number) => {
    let e = wallCache.get(ci)
    if (e) return e
    const cv = document.createElement('canvas'); cv.width = CARD_PX; cv.height = Math.round(CARD_PX * (2 / 3 + STRIP))
    const c = cv.getContext('2d')!
    c.fillStyle = '#0d0f13'; c.fillRect(0, 0, cv.width, cv.height)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.anisotropy = 4
    const entry = { tex, ready: false, used: time }; e = entry; wallCache.set(ci, entry); born++
    // a person's card is mostly their photo: the band holds just the name and
    // role (the card's own size and place are the cars' exactly)
    const card = cards[ci], ph = card?.person ? cv.height - Math.round(CARD_PX * 58 / cardCss) : Math.round(CARD_PX * 2 / 3)
    const src = card?.images[0]
    Promise.all([src ? loadImg(src) : Promise.resolve(null), document.fonts?.ready]).then(([im]) => {
      // a portrait is anchored at its top (each one is cut to the same margin
      // above the hair, scripts/team-cards.mjs): only the chest is ever trimmed
      if (im) cover(c, im as HTMLImageElement, 0, 0, CARD_PX, ph, card?.person ? 0 : 0.5)
      else {
        const gr = c.createLinearGradient(0, 0, CARD_PX, ph)
        gr.addColorStop(0, '#1c1f24'); gr.addColorStop(1, '#0e0f12')
        c.fillStyle = gr; c.fillRect(0, 0, CARD_PX, ph)
        // no photo of a person: their initials, as on the team page
        if (card?.person) {
          const ini = card.title.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('')
          c.fillStyle = 'rgba(255,255,255,.55)'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'rtl'
          c.font = `600 ${Math.round(ph * 0.28)}px ${opts.font}`; c.fillText(ini, CARD_PX / 2, ph / 2)
          c.textBaseline = 'alphabetic'; c.direction = 'ltr'; c.textAlign = 'left'
        }
      }
      if (card) drawInfo(c, card, ph)
      tex.needsUpdate = true; uploadQ.push(tex); entry.ready = true; dirty = true
    })
    // room for the faces drawn ahead of the other set (the team) too, so they
    // never push out a face the walk is about to need
    if (wallCache.size > 26 + Math.min(opts.preload?.length ?? 0, 12)) {   // let go of the card shown longest ago (never one on show)
      let worst = -1, wd = Infinity
      wallCache.forEach((v, k) => { if (k !== ci && !held.has(k) && v.used < wd) { wd = v.used; worst = k } })
      const w = wallCache.get(worst)
      if (w) { w.tex.dispose(); wallCache.delete(worst) }
    }
    return entry
  }
  // The cards are laid out on the screen like the cars page: two a row, in
  // the room between the bar above and the search below, the first row at
  // the top; the rows run on down, curving away a little at the edges
  const layout = () => {
    const w = viewW || canvas.clientWidth, h = viewH || canvas.clientHeight
    if (!w || !h) return
    layCam.copy(camera)
    layCam.position.set(0, 1.6, endZ); layCam.lookAt(0, 1.6 + Math.tan(pitch1) * 30, endZ - 30); layCam.updateMatrixWorld()
    const hy = WALL_R * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), hx = hy * camera.aspect
    const mpp = (2 * hy) / h                                     // metres per css px at the cards
    const availW = 2 * hx - 2 * insetSide * mpp
    const top = hy - insetTop * mpp, bottom = -hy + insetBottom * mpp, availH = Math.max(0.2, top - bottom)
    const gap = 12 * mpp
    // the cards' sizes: two a row as wide as half the view, one a row (a
    // handful of cars) as wide as the view — one design, the compact band
    const W = gcols === 1 ? Math.min(availW, 430 * mpp) : Math.min((availW - gap) / 2, 420 * mpp)
    const css = W / mpp, wide = false
    // a wide card (one a row) holds its name on one line: a lower band, no gap
    const strip = (gcols === 1 ? BAND_WIDE : BAND_CSS) / css
    const redraw = Math.abs(css - cardCss) / cardCss > 0.08 || Math.abs(strip - STRIP) > 0.01 || wide !== wideFace
    STRIP = strip; cardCss = css; wideFace = wide
    cardW = W; cardH = W * (2 / 3 + STRIP); pitch = cardH + gap; colX = gcols === 1 ? 0 : (W + gap) / 2
    // a small breath inside the zone: a card at rest never meets the fade
    const PADV = 10 * mpp
    gridTop = top - PADV; pitchPx = pitch / mpp
    rowsFit = Math.max(1, Math.floor((availH - 2 * PADV + gap) / pitch))
    zoneH = availH - 2 * PADV; gapM = gap
    if (redraw) {   // the faces are drawn again at the new size
      wallCache.forEach(v => v.tex.dispose()); wallCache.clear()
      held.forEach(hd => { hd.m.material.uniforms.map.value = ensureCard(hd.car).tex })
    }
    allMeshes.forEach(dress)
    dirty = true
  }
  // a card's place: its row and column (RTL: the first on the right), the
  // list scrolled to row `s`. Flat: every row square to you at one distance,
  // moving only up and down — no drum, no lean at the top and bottom
  const gridPlace = (r: number, col: number, s: number, outP: THREE.Vector3, outQ: THREE.Quaternion) => {
    const yFlat = gridTop - cardH / 2 - (r - s) * pitch
    outP.set(colX * (1 - 2 * col), yFlat, -WALL_R).applyMatrix4(camera.matrixWorld)
    outQ.copy(camera.quaternion)
  }
  // in rows: how far the list can move before its last row sits on the bottom of the view
  const maxScroll = () => Math.max(0, (Math.ceil(N / gcols) * pitch - gapM - zoneH) / pitch)
  // the screens out in front of you: from their place on the ring to the same
  // place as seen from the hall's middle, carried with you
  const placeShow = (p: number, dt: number) => {
    // growing out: on the clock (a slow frame jumps ahead instead of dragging
    // the move), quick off the mark and easing into place
    const gt = growAt < 0 ? 0 : Math.min(1, (performance.now() - growAt) / GROW_MS)
    if (gt > 0 && gt < 1) dirty = true
    const g0 = calm ? (gt > 0 ? 1 : 0) : 1 - (1 - gt) ** 4
    // the big screens stay carried with you through the walk — each hands
    // itself over to its own card the moment that card's glide begins, so
    // nothing ever rushes away or sweeps past
    // the fold trial: the screens close back onto the stand as the walk begins
    // (and grow out again on the way back) — the same path they grew out on
    const g = FOLD ? g0 * (1 - smooth(fit(walkU, 0, FOLD_IN))) : g0
    showK = g
    ring.updateMatrixWorld(true); camera.updateMatrixWorld()
    invLay.copy(layCam.matrixWorld).invert(); layQi.copy(layCam.quaternion).invert()
    cardMeshes.forEach((m, i) => {
      const sm = showMeshes[i], u = m.material.uniforms
      const on = m.visible
      srcP.set(0, 0, R).applyMatrix4(m.matrixWorld); m.getWorldQuaternion(srcQ)
      ringP[i].copy(srcP); ringQ[i].copy(srcQ)
      endP.copy(srcP).applyMatrix4(invLay).applyMatrix4(camera.matrixWorld)
      endQ.copy(camera.quaternion).multiply(tmpQ.copy(layQi).multiply(srcQ))
      // and pulled in toward you, so the street screens stand as large as the
      // frame allows — a zoom about the camera, which keeps their arrangement
      endP.sub(camera.position).multiplyScalar(mobile ? 0.74 : 0.8).add(camera.position)
      // already outside as it starts: it sits on your own line of sight to
      // the real screen, out at the end pose's distance, scaled to cover it
      // exactly — then grows along that line, never passing the door's posts
      const dSrc = srcP.distanceTo(camera.position), dEnd = endP.distanceTo(camera.position)
      const s0 = dEnd / Math.max(dSrc, 1e-4)
      tmpV.copy(srcP).sub(camera.position).multiplyScalar(s0).add(camera.position)
      showP[i].lerpVectors(tmpV, endP, g); showQ[i].slerpQuaternions(srcQ, endQ, g)
      sm.scale.setScalar(Math.min(1, s0) + (1 - Math.min(1, s0)) * g)
      sm.position.copy(showP[i]); sm.quaternion.copy(showQ[i])
      // ONE set of screens on show at any moment. On the street the big
      // twins are the screens; the three facing you each hand themselves to
      // their own card the instant its glide begins, the others fade as you
      // step in. The ring on the plinth never shows once the twins are out —
      // it showed the very same cars behind the flying cards (the doubling)
      if (FOLD) {
        // home on the stand they are its own screens again: the three facing
        // you set off from here into the grid, the rest sink into the stand
        u.uFade.value = 1   // never a fade: everything here moves
        const rel = relOfSlot(i), open = easeInOut(fit(walkU, FOLD_OPEN, 1))
        const gone = rel !== null && flightE(rel) > 0
        sm.visible = on && g > 0.002
        m.visible = (g <= 0.002 && !gone && open < 0.999) || (g <= 0 && p <= 0.02)
        m.scale.setScalar(rel === null ? Math.max(1e-4, 1 - open) : 1)
        return
      }
      const rel = relOfSlot(i)
      u.uFade.value = mapped && rel === null ? 1 - smooth(fit(throwK, 0, 0.3)) : 1
      const gone = rel !== null && flightE(rel) > 0
      sm.visible = on && g > 0 && !gone && u.uFade.value > 0.002
      m.visible = g <= 0 && p <= 0.02   // the ring shows only before the grow, on the street
    })
  }
  const placeWall = (p: number, dt: number) => {
    // walking in: the screens go in with you and scatter as one move, in
    // step with the walk from its first step to its last
    // The walk's progress is eased (fast off the mark, a long soft arrival),
    // so anything keyed straight to it happened in the first fraction of a
    // second and then crawled. The scatter runs on the walk's own TIME: the
    // ease is undone per direction (in: p = 1-(1-x)^3; out: p = (1-x)^3),
    // blended softly if the walk turns round mid-way
    // The timeline ADVANCES from where it is, by each frame's step mapped
    // through the current direction's undoing of the ease — never jumps to
    // the other direction's mapping: a walk turned round mid-way (in: p = 1 -
    // (1-x)^3 → u = 1 - cbrt(1-p); out: p = (1-x)^3 → u = cbrt(p) — at
    // p = .5 those read .21 and .79) leapt the cards almost into the grid
    if (p !== lastP) {
      walkDir = p > lastP ? 1 : -1
      const map = walkDir > 0 ? (q: number) => 1 - Math.cbrt(Math.max(0, 1 - q)) : (q: number) => Math.cbrt(Math.max(0, q))
      walkU = Math.min(1, Math.max(0, walkU + map(p) - map(lastP)))
      lastP = p
    }
    if (p >= 1) walkU = 1
    else if (p <= 0) walkU = 0
    const tk = throwK
    if (walkU !== lastWalkU) {
      const m = walkU < lastWalkU ? (u: number) => fit(u, 0.2, 0.985) : (u: number) => fit(u, 0.04, 0.88)
      throwK = Math.min(1, Math.max(0, throwK + m(walkU) - m(lastWalkU)))
      lastWalkU = walkU
    }
    if (walkU >= 1) throwK = 1
    else if (walkU <= 0) throwK = 0
    if (throwK !== tk) dirty = true
    wallOn = throwK >= 0.98
    // the screens facing you, frozen as the walk begins: their cars open the list
    if (p > 0.02 && !mapped && N) {
      // (no snap: a screen still turning finishes its turn as it flies)
      drag = Math.round(angle / STEP) * STEP; autoT = 0
      r0m = Math.round(drag / STEP)
      // the street shows the history, not cars: the list opens at its own
      // first car (the newest), not wherever the gallery had turned to
      listStart = S > 0 ? 0 : r0m - base; anchor = 0
      scrollPos = scrollTarget = 0; mapped = true
    }
    // on the street: the faces of the cards about to fly, and the ring faces
    // the screens will dissolve to, are drawn and uploaded ahead, in idle time
    if (!mapped && N && screenOn && readyAt >= 0 && performance.now() - readyAt > 1200) {
      const r0 = Math.round(drag / STEP)
      // every card the first view of the hall will hold, faces drawn ahead —
      // as far down as the list's window reaches (its rows in view, one more,
      // the two drawn ahead for the scroll) and a row to spare: the rows that
      // fit can grow by one as the foot is measured on the way in
      const ahead = Math.min(N, (rowsFit + 5) * gcols)
      for (let d = 0; d < ahead; d++) ensureCard(view[mod((S > 0 ? 0 : r0 - base) + d, N)])
      // and the gallery's own next photos, so a slide never starts a texture
      if (S) for (let d = -2; d <= 3; d++) ensureTex(sAt(r0 + d))   // every screen the stand can show, the leftmost too (it showed again on the way out)
    }
    // the other set (the team): drawn as soon as the street is up, not after
    // the idle beat, so "הצוות" pressed at once still walks into ready faces
    if (!mapped && opts.preload && readyAt >= 0) for (const ci of opts.preload.slice(0, 12)) ensureCard(ci)
    if (p <= 0.02 && throwK <= 0 && mapped) mapped = false
    // heading out only: it stayed on after the walk home, and every later
    // walk in then skipped the main screen's turn
    if (exitRide && (walkDir > 0 || !mapped)) exitRide = false
    const full = throwK >= 1
    if (wasFull && !full) {
      // walking out: the cards in front of you go back into the screens
      // the first row in view goes back to the screens facing you
      const i0 = Math.min(N - 1, Math.max(0, Math.round(scrollPos) * gcols))
      anchor = i0; base = r0m - listStart - anchor; dirty = true
      // walking out, the first card in view grows back into the big screen
      // still wearing its car: only that one face is needed, made ready now
      // A person is never left on the street: their card turns home to the
      // history like the others
      exitRide = !FOLD && !cards[listCar(anchor)]?.person
      if (exitRide) ensureTex(listCar(anchor))   // already made while browsing — a no-op
    }
    if (full) {
      exitRide = false
      // while browsing, the face the first card in view would leave on the
      // big screen is made ready in idle time, so the walk out births nothing
      if (p >= 1 && !holding && !fling && Math.abs(scrollTarget - scrollPos) < 1e-3 && performance.now() - scrollAt > 400 && N) {   // only once the walk, and the list, have come to rest
        const i0 = Math.min(N - 1, Math.max(0, Math.round(scrollPos) * gcols))
        if (!texCache.has(listCar(i0)) && !cards[listCar(i0)]?.person) ensureTex(listCar(i0))
      }
      // at rest the hall is no longer redrawn, but that face must still be
      // made: the frames keep coming until it is ready (then they stop)
      if (p >= 1 && N) {
        const c0 = listCar(Math.min(N - 1, Math.max(0, Math.round(scrollPos) * gcols)))
        if (!cards[c0]?.person && !texCache.get(c0)?.ready) dirty = true
      }
    }
    wasFull = full
    if (opts.light) {
      // the hall brightens over the walk's last stretch — gradual, never a
      // snap — and only part way: the hall stays clearly itself, just light
      // the hall rides the very same window as the page and the sheets (see
      // Showroom): one factor, no chasing clock, nothing drifts apart
      const b0 = briK
      briK = calm ? (full ? 1 : 0) : smooth(fit(p, 0.86, 0.96))   // the hall stays itself through the flights; the one short cross at the end (rule 5)
      if (briK !== b0) dirty = true
      const k = briK
      renderer.toneMappingExposure *= 1 + 0.85 * k
      dayFill.intensity = 2.6 * k
      scene.environmentIntensity = 0.35 + 0.9 * k
      bloom.strength *= 1 - k
      const va = (opts.veil ?? 0.55) * k
      veil.material.uniforms.uA.value = va; veil.material.uniforms.uExp.value = renderer.toneMappingExposure; veil.visible = va > 0.002
    }
    if (!holding) {
      if (fling) {
        // the throw runs on, braking smoothly; past either end it stops and
        // springs back; once slow, it eases onto the nearest row
        scrollPos += vy * dt; vy *= Math.exp(-dt * 2.1)
        const max = maxScroll()
        if (scrollPos < 0 || scrollPos > max) { vy = 0 }
        if (Math.abs(vy) < 0.15) { fling = false; scrollTarget = Math.min(max, Math.max(0, scrollPos)) }
        dirty = true
      } else {
        const sp = scrollPos
        scrollPos += (scrollTarget - scrollPos) * (1 - Math.exp(-dt * 9))
        if (Math.abs(scrollTarget - scrollPos) < 1e-4) scrollPos = scrollTarget
        if (scrollPos !== sp) dirty = true
      }
    }
  }
  // the bright trial: inside, a light wash over the hall (it still shows through), under the cards
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uExp: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `uniform float uA; uniform float uExp; varying vec2 vUv;
      vec3 odtInv(vec3 y){ vec3 a = 1. - .983729 * y; vec3 b = .0245786 - .432951 * y; vec3 c = -(.000090537 + .238081 * y); return (-b + sqrt(max(b * b - 4. * a * c, 0.))) / (2. * a); }
      vec3 acesInv(vec3 col){
        mat3 invIn = mat3(1.76474, -.14703, -.03634, -.67578, 1.16025, -.16244, -.08896, -.01322, 1.19877);
        mat3 invOut = mat3(.64304, .05927, .00596, .31119, .93144, .06393, .04578, .00929, .93012);
        return invIn * odtInv(clamp(invOut * col, vec3(0.), vec3(.995))) * (.6 / max(uExp, .001));
      }
      void main(){
        vec3 c = mix(vec3(.86, .875, .89), vec3(.955, .96, .968), vUv.y);   // a touch deeper at the floor
        gl_FragColor = vec4(acesInv(pow(c, vec3(2.2))), uA);
      }`,
    transparent: true, depthTest: false, depthWrite: false,
  }))
  veil.frustumCulled = false; veil.renderOrder = -10; veil.visible = false
  if (opts.light) wallScene.add(veil)
  // the bright hall: a soft white fill, so its own shapes read light, under the wash
  const dayFill = new THREE.HemisphereLight('#ffffff', '#e8eaee', 0)
  if (opts.light) scene.add(dayFill)
  let briK = 0
  // a person open over the hall: the cards step out, the room stays
  let hideT = false, hideK = 0
  const placeCards = (dt: number) => {
    const hk = hideK
    hideK += ((hideT ? 1 : 0) - hideK) * (1 - Math.exp(-dt * 10))
    if (Math.abs(hideK - (hideT ? 1 : 0)) < 2e-3) hideK = hideT ? 1 : 0
    if (hideK !== hk) dirty = true
    // the column count follows the stock on show
    const wc = N <= 5 ? 1 : 2
    if (wc !== gcols) { gcols = wc; layout() }
    // the native scroller's length follows the list
    const key = `${N}|${gcols}|${pitchPx.toFixed(1)}|${maxScroll().toFixed(3)}`
    if (key !== infoKey || infoReset) { infoKey = key; opts.onScrollInfo?.(maxScroll() * pitchPx, pitchPx, infoReset); infoReset = false }

    const want = new Map<number, number>()   // car → its place in the list
    if (throwK > 0 && N) {
      // two rows ahead on each side, always: with the native scroller the
      // scene's own finger speed is 0, and faces were drawn only as their row
      // came into view — mid-scroll
      const ahead = 2
      const r0 = Math.max(0, Math.floor(scrollPos) - 1 - ahead), r1 = Math.ceil(scrollPos) + rowsFit + 1 + ahead
      for (let i = r0 * gcols; i <= Math.min(N - 1, r1 * gcols + gcols - 1); i++) want.set(listCar(i), i)
      if (throwK < 1) for (const f of FLY) { const i = anchor + f.at; if (i >= 0 && i < N) want.set(listCar(i), i) }
    }
    held.forEach(hd => { if (!want.has(hd.car)) hd.live = false })
    const ease = 1 - Math.exp(-dt * 9)
    want.forEach((i, car) => {
      let hd = held.get(car)
      if (!hd) {
        const m = takeMesh()
        m.userData.car = car; m.material.uniforms.map.value = ensureCard(car).tex
        // new with a filter: it grows in where it belongs; otherwise just there
        hd = { m, car, i, pr: Math.floor(i / gcols), pc: i % gcols, vis: viewChanged ? 0 : 1, live: true }
        held.set(car, hd)
      } else if (viewChanged && Math.abs(hd.pr - Math.floor(i / gcols)) > 2) { hd.pr = Math.floor(i / gcols); hd.pc = i % gcols; hd.vis = 0 }
      hd.live = true; hd.i = i
      const tr = Math.floor(i / gcols), tc = i % gcols, r0 = hd.pr, c0 = hd.pc
      hd.pr += (tr - hd.pr) * ease; hd.pc += (tc - hd.pc) * ease
      if (Math.abs(tr - hd.pr) < 1e-4) hd.pr = tr
      if (Math.abs(tc - hd.pc) < 1e-4) hd.pc = tc
      if (hd.pr !== r0 || hd.pc !== c0) dirty = true
    })
    viewChanged = false
    let openK = 0
    if (opening) {
      opening.t += dt; dirty = true
      openK = easeInOut(Math.min(1, opening.t / 0.5))
      if (!opening.fired && opening.t > 0.34) { opening.fired = true; opts.onOpen(opening.h.car) }
      if (opening.t > 2.5) opening = null   // nothing opened (or you came back): settle
    }
    held.forEach(hd => {
      const { m } = hd, u = m.material.uniforms
      const v0 = hd.vis
      hd.vis = Math.min(1, Math.max(0, hd.vis + (hd.live ? dt / 0.28 : -dt / 0.18)))
      if (hd.vis !== v0) dirty = true
      if (!hd.live && hd.vis <= 0) { m.visible = false; m.userData.car = -1; freeMeshes.push(m); held.delete(hd.car); if (hovered === m) hovered = null; return }
      const e = wallCache.get(hd.car)
      if (e) e.used = time
      u.uReady.value = e?.ready ? 1 : 0
      u.uExp.value = renderer.toneMappingExposure
      // its place in the grid
      gridPlace(hd.pr, hd.pc, scrollPos, tmpV, tmpQ)
      const off = hd.pr - scrollPos
      let bright = 1
      let sc = 1, sx = 1, a = 1, strip = 1
      let flying = false, flyE = 1   // in flight (the scatter, the walk out), and how far along
      const fly = FLY.find(f => anchor + f.at === hd.i)
      const rel = fly ? fly.rel : 99
      if (mapped && fly && (FOLD ? walkU < 1 : throwK < 1)) {
        // the scatter: the screen flies to its place, turning to you, and the
        // band opens under its photo as it lands
        const fe = flightE(rel), sl = slotOf(rel), sc0 = CW / cardW
        flying = true; flyE = fe
        // the big screen IS the card: its carried pose is camera-glued, so
        // the glide from full size into the grid cell is steady on screen
        srcP.copy(showP[sl]); srcQ.copy(showQ[sl])
        srcP.sub(tmpV2.set(0, ((cardH - (cardW * 2) / 3) / 2) * sc0, 0).applyQuaternion(srcQ))   // its photo exactly on the screen
        m.position.lerpVectors(srcP, tmpV, fe); m.position.y += Math.sin(Math.PI * fe) * 0.05
        m.quaternion.slerpQuaternions(srcQ, tmpQ, fe)
        sc = sc0 + (1 - sc0) * fe
        const sb = 1 - 0.72 * slotDim[sl]
        bright = sb + (bright - sb) * fe
        strip = fit(fe, 0.75, 1)   // the band unfolds on landing, never in the air
        // The screen TURNS OVER in flight — his own idea, and the right
        // one: the front face wears the screen's photo, the back face the
        // car, and the half-turn is what changes the picture. Walking out
        // it turns home the same way (fe runs back), so the sides land as
        // history seamlessly; ONLY the middle card skips the turn on the
        // way out, lands still wearing its car and leaves that photo on
        // the main screen — one guest in the gallery
        const srcCar = cardMeshes[sl].userData.car as number
        if (S > 0 && !(exitRide && rel === 0) && srcCar !== hd.car) {
          if (srcCar >= 0 && m.userData.src2 !== srcCar) { m.userData.src2 = srcCar; u.map2.value = ensureTex(srcCar).tex }
          // the turn, the native way: a cosine squash of the width with the
          // face swapped at the zero crossing — a 3D turn of a near-full
          // screen smeared in perspective ("stretches, then straightens");
          // the flat flip reads clean at any distance, like iOS's own
          const fl = smooth(fit(fe, 0.35, 0.65))
          sx = Math.max(0.015, Math.abs(Math.cos(Math.PI * fl)))
          u.uFlip.value = fl < 0.5 ? 1 : 0
        } else u.uFlip.value = 0
        // the guest is handed to the screen as the card is all but home (the
        // screen stays hidden under the card until it lands, so the hand-off
        // is invisible) — at exactly 0 the walk's last frame also unmaps
        if (exitRide && rel === 0 && fe < 0.03 && hd.car >= 0) {
          const sm = cardMeshes[sl], ku = sm.userData
          if (ku.car !== hd.car) { ku.guestK = sIdxK(sl); ku.car = hd.car; sm.material.uniforms.map.value = ensureTex(hd.car).tex }
        }
        // the card's shadow halo dies away before it lands on the screen, and
        // goes out with the hall's lights on the way to the street — a screen
        // never carries a shadow, and nothing lingers after dark
        u.uShade.value = 0.4 * fit(fe, 0.25, 0.9) * smooth(fit(progress, 0.1, 0.35))
        if (fe <= 0) a = 0
      } else {
        m.position.copy(tmpV); m.quaternion.copy(tmpQ)
        u.uFlip.value = 0   // settled: the card shows its own face, no turn
        u.uShade.value = 0.4 * smooth(fit(progress, 0.1, 0.35))
        const ri = hd.i - anchor - FLY.length
        if (calm) a = throwK
        else if (FOLD && walkU < 1) {
          // the rest of the grid rises from below as one block, out from behind
          // the foot's dividing line (cut there, so nothing ever fades), landing
          // with the three screens
          const e = easeInOut(fit(walkU, FOLD_OPEN, 1))
          m.position.addScaledVector(tmpV2.set(0, -1, 0).applyQuaternion(camera.quaternion), (1 - e) * (zoneH + cardH + 0.1))
          flying = e < 1; flyE = e
        }
        else if (mapped && throwK < 1 && ri >= 0) {
          // the rest of the stock is DEALT out of the main screen: each card
          // leaves its centre small, flies to its cell growing to full size
          // and turns to you — the screens' own move, a beat apart; walking
          // out they fly back into it the same way
          const o = 0.2 + Math.min(ri, 9) * 0.03
          const fe = easeInOut(fit(throwK, o, 1)), sl = slotOf(0)
          srcP.copy(showP[sl]); srcQ.copy(showQ[sl])
          m.position.lerpVectors(srcP, tmpV, fe); m.position.y += Math.sin(Math.PI * fe) * 0.04
          m.quaternion.slerpQuaternions(srcQ, tmpQ, fe)
          sc = 0.35 + 0.65 * fe
          strip = fit(fe, 0.75, 1)   // the band unfolds on landing, as on the screens
          a = smooth(fit(fe, 0, 0.18))
          flying = true; flyE = fe
        } else if (throwK < 1) {
          // not in flight and not fully inside: never shown. The walk out's
          // last frame unmaps the scene while cards are still fading, and
          // without this they fell back to their grid places at full alpha —
          // the grid flashed over the street
          a = 0
        }
      }
      const lift = u.uLift.value + ((m === hovered ? 1 : 0) - u.uLift.value) * (1 - Math.exp(-dt * 14))
      if (Math.abs(lift - u.uLift.value) > 1e-3) dirty = true
      u.uLift.value = lift
      sc *= 1 + lift * 0.02
      const vv = smooth(hd.vis)
      sc *= calm ? 1 : 0.86 + 0.14 * vv
      // no fade of whole rows: a row leaving the view is simply cut at the
      // dividing line (the shader's short clip) — the row-wide fade washed out
      // the top row across its whole height
      a *= vv
      u.uClipOn.value = 1
      if (opening) {
        if (opening.h === hd) {
          // up to the camera, square to it, near enough to cover the whole screen
          const vf = THREE.MathUtils.degToRad(camera.fov) / 2, hf = Math.atan(Math.tan(vf) * camera.aspect)
          const dist = Math.min(cardH / 2 / Math.tan(vf), cardW / 2 / Math.tan(hf)) * 0.96
          endP.set(0, 0, -dist).applyMatrix4(camera.matrixWorld); endQ.copy(camera.quaternion)
          m.position.lerp(endP, openK); m.quaternion.slerp(endQ, openK)
          bright += (1 - bright) * openK
          u.uClipOn.value = 1 - openK
          m.renderOrder = 1
        } else a *= 1 - openK
      } else m.renderOrder = 0
      a *= 1 - hideK
      u.uAlpha.value = a; u.uBright.value = bright; u.uStrip.value = strip
      {
        // corners and edge: a landed card has its own; in flight they morph to
        // the screen's (its rounded corners, no edge line), so the hand-off to
        // or from the big screen shows no frame popping in or out
        const own = cardW * 0.028, scr = 0.055 / Math.max(CW / cardW, 1e-3)
        const f = flying ? smooth(fit(flyE, 0.55, 1)) : 1
        u.uRad.value = scr + (own - scr) * f
        u.uEdgeK.value = (opts.light ? 0.06 : 0.14) * f
      }
      {
        const card = cards[hd.car], k = cardW / cardCss   // metres per css px on the card
        if (card?.make) {
          const pl = pillOf(card.stock !== false)
          u.pillMap.value = pl.tex
          const w = pl.w * k, h = PILL_H * k
          u.uPillR.value.set(cardW / 2 - 8 * k - w, cardH / 2 - 8 * k - h, w, h)
          // landed: on; in flight (the scatter, the walk out): off
          u.uPill.value = flying ? smooth(fit(flyE, 0.88, 1)) : 1
        } else u.uPill.value = 0
      }
      m.visible = a > 0.002
      const pad = cardW * 0.07
      m.scale.set((cardW + pad * 2) * sc * sx, (cardH + pad * 2) * sc, 1)
    })
  }
  const wallHit = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    return ray.intersectObjects(allMeshes, false).find(h => h.object.visible && (h.object as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>).material.uniforms.uAlpha.value > 0.5)?.object ?? null
  }
  const openCard = (o: THREE.Object3D) => {
    const car = o.userData.car as number
    const hd = held.get(car)
    if (!hd || opening) return
    // a person opens at once: their page grows out of this very card (the
    // hall's layer takes the card's place on screen — see cardRect)
    if (calm || cards[car]?.person) { opts.onOpen(car); return }
    opening = { h: hd, t: 0, fired: false }; dirty = true
  }

  // ─── Post: bloom (only the sign, spots and rings exceed 1), tilt-shift on desktop ───
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })
  const composer = new EffectComposer(renderer, rt)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.5, 1.0)
  if (!mobile) composer.addPass(bloom)   // half-res bloom on tiny lights flickered on phones
  const tilt = new ShaderPass(TiltShift)
  if (!mobile) composer.addPass(tilt)
  const wallPass = new RenderPass(wallScene, camera)
  wallPass.clear = false
  composer.addPass(wallPass)
  composer.addPass(new OutputPass())
  // Every shader the walk draws with, prepared on the street ahead of time.
  // Measured (a performance trace of the walk): two were built mid-walk and
  // froze it — the cards' own, because the load-time compile above was made
  // for the screen while the cards are drawn into the composer's target (a
  // different version of the shader), at ~0.16; and the hall's veil, invisible
  // at load and so skipped, at ~0.91, just before the end. Prepared for the
  // composer's target, with the veil shown for the compile only; compileAsync
  // lets the GPU build them in the background
  let warmed = false
  const warmShaders = () => {
    warmed = true
    const prev = renderer.getRenderTarget(), vv = veil.visible
    const w = takeMesh(); w.visible = true; veil.visible = true
    const shown = showMeshes.map(sm => sm.visible); showMeshes.forEach(sm => { sm.visible = true })
    renderer.setRenderTarget(composer.readBuffer)
    renderer.compileAsync(wallScene, camera).catch(() => {})
    renderer.compileAsync(scene, camera).catch(() => {})
    renderer.setRenderTarget(prev)
    veil.visible = vv; w.visible = false; freeMeshes.push(w)
    showMeshes.forEach((sm, i) => { sm.visible = shown[i] })
  }

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
  let scrollSource: (() => number | null) | null = null, lastSr: number | null = null
  let progress = 0, shown = -1, dirty = true, time = 0, tvClock = 0, hallClock = 0, autoT = 0, swapHold = 0
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
    // the doors part in one clear sweep just as you reach them (over five
    // metres of approach the move was too slow to be seen)
    const open = smooth(fit(z, 5.4, 3.4))
    doors.forEach((d, i) => {
      const s = i === 0 ? -1 : 1
      d.position.x = s * (0.6 + open * 1.15)
      // the frame (two posts and the header) stands still; only the glass slides
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
    if (Math.abs(target - angle) > 1e-3) dirty = true   // the slide plays out even when nothing else moves
    // it floats only once you are on your way in: from the street it stands still
    // (its slow bob, drawn only now and then while the page loads, read as a flicker)
    ring.position.y = 1.72 + Math.sin(time * 0.9) * 0.035 * fit(p, 0.1, 0.5)
    cardMeshes.forEach((m, i) => {
      let th = (-i * STEP + angle) % (Math.PI * 2)
      if (th > Math.PI) th -= Math.PI * 2
      if (th < -Math.PI) th += Math.PI * 2
      const u = m.material.uniforms
      // the screens are dark from the street and switch on as you walk in
      // (one after another), off again as you walk out
      // the screen facing the street is on from the start (once everything
      // has loaded); the other screens come on only inside and go off on the
      // way out. Ramped per frame, so a slow device still reaches full
      // once ignited at load, the screens simply stay on: no switch-off on
      // the way out and no re-ignition on the way in
      const onNow = screenOn
      const before = u.uPower.value
      u.uPower.value = Math.min(1, Math.max(0, before + (onNow ? dt / 0.35 : -dt / 0.25)))
      if (u.uPower.value !== before) dirty = true
      u.uDim.value = smooth(fit(Math.abs(th), 0.18, 1.1)); slotDim[i] = u.uDim.value
    })
    // dress each slot with the car that belongs at its spot of the ring, so
    // browsing runs through the whole stock, newest to oldest, in a loop
    // a new set of cars: dark first, then the screens are re-dressed with it,
    // the first match at the front, and light up again
    if (pendingView) {
      swap = Math.min(1, swap + dt / 0.16); dirty = true
      if (swap >= 1) {
        view = pendingView; pendingView = null; N = view.length
        drag = Math.round(drag / STEP) * STEP; base = Math.round(drag / STEP); autoT = 0
        listStart = 0; scrollTarget = 0; scrollPos = 0; viewChanged = true; infoReset = true
      }
    } else if (swap > 0) {
      // hold the dark a moment for the front photo, never long
      const fc = onStreet ? sAt(Math.round(drag / STEP)) : carAt(Math.round(drag / STEP))
      swapHold = texCache.get(fc)?.ready || fc < 0 ? 0 : swapHold + dt
      if (!swapHold || swapHold > 0.6) swap = Math.max(0, swap - dt / 0.32)
      dirty = true
    }
    const pos = angle / STEP
    // fewer cars than screens: only as many screens as cars, around the front
    const CNT = onStreet ? S : N
    const r0 = Math.round(pos), lo = -Math.floor((CNT - 1) / 2), hi = Math.ceil((CNT - 1) / 2)
    cardMeshes.forEach((m, sIdx) => {
      const k = sIdx + SLOTS * Math.round((pos - sIdx) / SLOTS)
      const show = CNT > 0 && (CNT >= SLOTS || (k - r0 >= lo && k - r0 <= hi))
      const car = show ? (onStreet ? sAt(k) : carAt(k)) : -1
      const u = m.material.uniforms
      // the one guest face (the stock photo the middle card left behind)
      // rides the gallery across the front AND side screens; only once its
      // screen has slid out of view does the history photo return
      if (m.userData.guestK === k && Math.abs(k - r0) <= 1) { /* the guest rides on */ }
      else {
        if (m.userData.guestK !== undefined) delete m.userData.guestK
        if (car >= 0 && m.userData.car !== car) { m.userData.car = car; u.map.value = ensureTex(car).tex }
      }
      m.userData.shown = show
      const a0 = u.uAlpha.value
      u.uAlpha.value = Math.min(1, Math.max(0, a0 + (show ? dt / 0.3 : -dt / 0.2)))
      if (u.uAlpha.value !== a0) dirty = true
      m.visible = u.uAlpha.value > 0.001
      const e = texCache.get(m.userData.car)
      if (e && show) e.used = time
      u.uReady.value = e?.ready ? 1 : 0
      u.uSwap.value = swap
      u.uFill.value = 1   // the photo fills the whole screen, both views
      u.uExp.value = renderer.toneMappingExposure
    })
    const f = onStreet ? -1 : carAt(Math.round(angle / STEP))
    if (f !== front) { front = f; opts.onFront(f) }
    placeWall(p, dt); placeShow(p, dt); placeCards(dt)
  }

  function setSize() {
    const w = canvas.clientWidth, h = canvas.clientHeight
    viewW = w; viewH = h
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
    layout()
    dirty = true
  }
  setSize()

  // ─── Touch / mouse: every sideways swipe turns the ring by exactly one
  //     card, in the finger's direction; a tap on the front card opens it,
  //     on another card brings it to the front ───
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2()
  let downX = 0, downY = 0, moved = false
  const settle = () => {
    drag = Math.round(drag / STEP) * STEP; autoT = 0
  }
  let tapOut = false
  let lastWheelAt = 0, wheelArmed = false, wheelAcc = 0, snapT = 0, pullOff = 0
  // inside: the finger holds the list (1:1), lets go with its speed and the
  // list comes to rest on a card; at the top, pulled on further, it gives
  // like rubber, and let go past the mark it walks you out
  let scroll0 = 0, vy = 0, lastMy = 0, lastMt = 0, topStart = false, pullPx = 0, fling = false
  const PULL = 90
  const onDown = (e: PointerEvent) => {
    autoT = 0
    if (progress < 0.05) { tapOut = true; downX = e.clientX; downY = e.clientY; return }   // the street: a tap on a screen walks in, a sideways swipe turns them
    if (progress < WALK - 0.04 || !wallOn) return
    dragging = true; moved = false; downX = e.clientX; downY = e.clientY
    holding = true; fling = false; scroll0 = scrollPos; scrollTarget = scrollPos; vy = 0; lastMy = e.clientY; lastMt = performance.now()
    topStart = scrollPos < 0.05; pullPx = 0
  }
  const onMove = (e: PointerEvent) => {
    if (tapOut) {
      // on the street, a sideways swipe turns the big screens by one (RTL: swipe right, the next comes in from the left)
      const dx = e.clientX - downX
      if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(e.clientY - downY)) { tapOut = false; settle(); drag += Math.sign(dx) * STEP; dirty = true }
      return
    }
    if (!dragging || !holding) return
    const dx = e.clientX - downX, dy = e.clientY - downY
    if (!moved) { if (Math.abs(dy) < 8 || Math.abs(dx) > Math.abs(dy)) return; moved = true }
    const raw = scroll0 - dy / pitchPx, max = maxScroll()
    // everything in view: the list does not move at all; else a short give at the ends
    scrollPos = max <= 0 ? 0 : raw < 0 ? raw * 0.25 : raw > max ? max + (raw - max) * 0.25 : raw
    scrollTarget = scrollPos
    const now = performance.now(), dtm = Math.max(8, now - lastMt)
    vy = vy * 0.5 + ((-(e.clientY - lastMy) / pitchPx) / (dtm / 1000)) * 0.5   // cards a second
    lastMy = e.clientY; lastMt = now; dirty = true
  }
  const release = (exit: boolean) => {
    holding = false
    opts.onPull?.(0)
    if (performance.now() - lastMt > 120) vy = 0
    // let go with the finger's speed: the list runs on and slows by itself,
    // and rests WHERE IT STOPS — free, like a page, never snapped to a row
    if (Math.abs(vy) > 0.4) fling = true
    else { fling = false; scrollTarget = Math.min(maxScroll(), Math.max(0, scrollPos)) }
    dirty = true
  }
  const onUp = (e: PointerEvent) => {
    if (tapOut) {
      tapOut = false
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return
      const r = canvas.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObjects([...cardMeshes, ...showMeshes], false).find(h => h.object.visible)
      if (hit) opts.onEnter?.()
      return
    }
    if (!dragging) return
    dragging = false
    if (moved) { release(true); return }
    holding = false; fling = false
    // a tap on a card opens it
    const o = wallHit(e)
    if (!o) { scrollTarget = Math.round(scrollPos); return }
    openCard(o)
  }
  // listened on the window: the canvas lets touches through (nothing fixed at the
  // top edge may take them, or Safari paints a strip behind the clock); presses
  // on the page's own buttons and links are theirs
  const onDownAny = (e: PointerEvent) => { if (!(e.target as Element | null)?.closest?.('a, button, nav, input, .sr-cap, .sr-scroller, .sr-sheet, .sr-dim')) onDown(e) }
  const onHover = (e: PointerEvent) => {
    if (mobile || e.pointerType !== 'mouse') return
    let next: THREE.Object3D | null = null
    if (wallOn && !opening && !(e.target as Element | null)?.closest?.('.sr-sheet')) next = wallHit(e)
    if (next !== hovered) { hovered = next; document.body.style.cursor = next ? 'pointer' : ''; dirty = true }
  }
  addEventListener('pointerdown', onDownAny)
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('pointermove', onHover, { passive: true })
  addEventListener('pointerup', onUp)
  addEventListener('pointercancel', () => { if (dragging) { dragging = false; if (holding) release(false) } })

  // ─── Loop: always running while the gallery floats; while walking it
  //     renders only when something moved ───
  const frames: number[] = []
  let last = performance.now(), raf = 0, running = true, signDone = false
  // the street screen ignites a beat after everything has loaded
  let screenOn = false
  const tick = (now: number) => {
    if (!running) return
    raf = requestAnimationFrame(tick)
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; time += dt   // (a rAF stamp can predate setup)
    // the native scroller's position, read here, once a frame: scroll events
    // come at the screen's rate (up to 120 a second), not the drawing's, and
    // left some frames two steps and some none — the tremble
    // Only when the scroller itself moved: the arrows, the keys and a wheel
    // off the list move the list through the scene, and must not be pulled back
    const sr = scrollSource?.() ?? null
    if (sr != null && sr !== lastSr) { scrollPos = scrollTarget = sr; scrollAt = performance.now(); fling = false; dirty = true }
    lastSr = sr
    // the kick wakes the render loop so the switch-on plays even at rest
    if (!screenOn && readyAt >= 0 && now - readyAt > 700) { screenOn = true; dirty = true }
    if (growAt < 0 && readyAt >= 0) {
      // a page opened inside: already out. On the street: as the screens light up,
      // once the three facing you have their photos (never waiting long)
      if (progress > 0.5) { growAt = now - GROW_MS; dirty = true }
      else if (screenOn && now - readyAt > 780 && (facingReady() || now - readyAt > 1600)) { growAt = now; dirty = true }
    }
    // the ring slides one screen on its own every five seconds: the middle
    // picture moves on and its neighbour takes the middle
    if (screenOn && N > 1 && !dragging && !pendingView && !swap && !mapped && progress < 0.02) { autoT += dt; if (autoT > 5) { autoT = 0; drag += STEP; dirty = true } } else autoT = 0
    pointerS.lerp(pointer, 1 - Math.exp(-dt * 4))
    if (!warmed && readyAt >= 0 && performance.now() - readyAt > 600 && progress < 0.02) warmShaders()
    const uq = uploadQ.shift()
    if (uq) { renderer.initTexture(uq); dirty = true }
    loadCards()
    let signRising = false
    if (readyAt >= 0 && !signDone) { const k = smooth(fit(now - readyAt, 200, 1200)); signLight(0.28 + 0.72 * k); signDone = k >= 1; signRising = !signDone }
    // the stand's ring floats only while it is part of the walk; inside, at
    // rest, nothing moves — the hall is drawn only when something changes
    // (it was redrawn every frame for a ring that is not on show)
    const floating = progress > 0.7 && progress < 0.999
    const moving = signRising || floating || dirty || Math.abs(progress - shown) > 1e-5 || pointerS.distanceToSquared(pointer) > 1e-6
    if (!moving) return
    dirty = false
    place(progress, dt); shown = progress
    composer.render(); reportSign()
    frames.push(dt * 1000); if (frames.length > 600) frames.shift()
  }
  if (!opts.manual) raf = requestAnimationFrame(tick)

  return {
    renderFrame(p) { hallClock = p > LIT ? POWER_END : 0; progress = p; time = 0; place(p, 1 / 30); composer.render(); reportSign() },
    setProgress(p) { progress = p },
    setPointer(x, y) { if (!mobile) pointer.set(x, y) },
    step(dir) {
      if (wallOn) { fling = false; scrollTarget = Math.min(maxScroll(), Math.max(0, Math.round(scrollTarget) + dir)); dirty = true; return }
      settle(); drag += dir * STEP; dirty = true
    },
    inside: () => wallOn,
    toTop() { if (!wallOn) return; fling = false; scrollTarget = 0; dirty = true },
    // the native scroller's position, followed exactly — its own momentum and
    // its own give at the ends (a negative or overshooting value) included
    setScrollSource(read) { scrollSource = read },
    setScroll(rows) { if (rows === scrollPos && rows === scrollTarget) return; scrollPos = scrollTarget = rows; scrollAt = performance.now(); fling = false; dirty = true },
    tapAt(x, y) { if (!wallOn || opening) return; const o = wallHit({ clientX: x, clientY: y } as PointerEvent); if (o) openCard(o) },
    atTop: () => scrollTarget <= 0.001,
    wheel(dy) {
      if (!wallOn) return false
      const now = performance.now(), gap = now - lastWheelAt
      lastWheelAt = now
      // the top only holds: leaving the hall is the logo's job now
      if (dy < 0 && scrollTarget <= 0.001) return true
      fling = false
      scrollTarget = Math.min(maxScroll(), Math.max(0, scrollTarget + dy / pitchPx))
      dirty = true
      return true
    },
    setInsets(t, b, sd) { insetTop = t; insetBottom = b; insetSide = sd; layout() },
    prepare(ids) {
      const first = ids.slice(0, (rowsFit + 5) * gcols)
      return first.every(ci => { const e = ensureCard(ci); return e.ready && !uploadQ.includes(e.tex) })
    },
    hideCards(on) { hideT = on; dirty = true },
    cardRect(ci) {
      // (a card stepped out for a person is still in its place: the person
      // closes back into it, so no visibility test here)
      const hd = held.get(ci)
      if (!hd) return null
      const m = hd.m, pad = cardW * 0.07
      // the face within the mesh (the mesh carries a shadow margin), and of it
      // the photo: the top 2/3 of a car's card, all but the band on a person's
      const fx = cardW / (cardW + pad * 2) / 2, fy = cardH / (cardH + pad * 2) / 2
      const photoH = cards[ci]?.person ? cardH - CARD_PX * 58 / cardCss / (CARD_PX * (2 / 3 + STRIP)) * cardH : cardW * 2 / 3
      const yb = fy - (photoH / (cardH + pad * 2))
      m.updateMatrixWorld()
      const r = canvas.getBoundingClientRect()
      const pts = [[-fx, fy], [fx, fy], [-fx, yb], [fx, yb]].map(([x, y]) => {
        const v = tmpV.set(x, y, 0).applyMatrix4(m.matrixWorld).project(camera)
        return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]
      })
      const xs = pts.map(q => q[0]), ys = pts.map(q => q[1])
      const x = Math.min(...xs), y = Math.min(...ys), w = Math.max(...xs) - x
      return { x, y, w, h: Math.max(...ys) - y, r: w * 0.028 }
    },
    setView(ids, instant) {
      const next = ids ?? Array.from({ length: TOTAL }, (_, i) => i)
      const cur = pendingView ?? view
      if (next.length === cur.length && next.every((v, i) => v === cur[i])) return
      // instant: on the street (the screens show the history, not the set) and
      // before a walk maps its first cards — no channel change to watch
      if (instant && !mapped) {
        // the same reset as the end of a change of channel
        view = next; pendingView = null; N = view.length
        drag = Math.round(drag / STEP) * STEP; base = Math.round(drag / STEP); autoT = 0
        listStart = 0; scrollTarget = 0; scrollPos = 0; viewChanged = true; infoReset = true; dirty = true
        return
      }
      pendingView = next; dirty = true
    },
    resize: setSize,
    stats() {
      const s = [...frames].sort((a, b) => a - b)
      return {
        born, walk: { throwK, walkU, mapped, wallOn, exitRide }, frames: s.length, avg: s.reduce((a, b) => a + b, 0) / (s.length || 1), p95: s[Math.floor(s.length * 0.95)] ?? 0,
        calls: renderer.info.render.calls, tris: renderer.info.render.triangles, dpr,
        angle: angle / STEP, drag: drag / STEP, progress, front,
      }
    },
    dispose() {
      running = false; cancelAnimationFrame(raf)
      removeEventListener('pointerdown', onDownAny)
      removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointermove', onHover)
      document.body.style.cursor = ''
      wallCache.forEach(v => v.tex.dispose()); allMeshes.forEach(m => m.material.dispose()); wallGeo.dispose()
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
