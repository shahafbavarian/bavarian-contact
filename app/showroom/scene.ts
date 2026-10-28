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
  dispose: () => void
  stats: () => { frames: number; avg: number; p95: number; calls: number; tris: number; dpr: number; angle: number; drag: number; progress: number; front: number }
}

// A card on the floating gallery: one of the site's destinations. One image
// = a photo card, several = a mosaic, none = a typographic card.
export type Card = { title: string; sub: string; href: string; external?: boolean; images: string[] }
type Opts = {
  mobile: boolean; logoUrl: string; signUrl: string; cards: Card[]; font: string
  onFront: (i: number) => void
  onOpen: (i: number) => void
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
  c.fillStyle = '#211f1d'; c.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 4; i++) {
    const x = (i % 2) * 256, y = Math.floor(i / 2) * 256
    c.fillStyle = `rgba(${i % 3 ? 255 : 0},${i % 3 ? 245 : 0},${i % 3 ? 235 : 0},0.025)`
    c.fillRect(x, y, 256, 256)
  }
  noise(c, 512, 512, 10)
  c.fillStyle = '#121110'
  c.fillRect(0, 0, 512, 3); c.fillRect(0, 256, 512, 3); c.fillRect(0, 0, 3, 512); c.fillRect(256, 0, 3, 512)
}, [rx, ry])

// The showroom's grooved wall: groups of three dark lines.
const wallTex = (rx: number) => canvasTex(256, 512, c => {
  c.fillStyle = '#d2d0cb'; c.fillRect(0, 0, 256, 512)
  noise(c, 256, 512, 5)
  c.fillStyle = 'rgba(40,38,36,.55)'
  for (const g of [120, 300]) for (let k = 0; k < 3; k++) c.fillRect(0, g + k * 14, 256, 2)
}, [rx, 1])

const paverTex = (rx: number, ry: number) => canvasTex(1024, 1024, c => {
  c.fillStyle = '#3c3d3d'; c.fillRect(0, 0, 1024, 1024)
  for (let y = 0; y < 1024; y += 32) for (let x = 0; x < 1024; x += 64) {
    const off = (y / 32) % 2 ? 32 : 0, s = 92 + Math.random() * 26
    c.fillStyle = `rgb(${s},${s},${s - 3})`
    c.fillRect(x + off + 2, y + 2, 60, 28)
  }
  noise(c, 512, 512, 14)
}, [rx, ry])

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
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', precision: 'highp' })
  renderer.setPixelRatio(dpr)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = env
  scene.environmentIntensity = 0.35

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
    metal: new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.35, metalness: 0.8 }),
    gloss: new THREE.MeshStandardMaterial({ color: '#060708', roughness: 0.14, metalness: 0.3, envMapIntensity: 1.4 }),
    glass: new THREE.MeshStandardMaterial({ color: '#6f8496', roughness: 0.04, metalness: 1, transparent: true, opacity: 0.12, envMapIntensity: 3, depthWrite: false }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#c9c6c0', roughness: 0.95 }),
    wall: new THREE.MeshStandardMaterial({ map: wallTex(6), roughness: 0.85 }),
  }

  const add = <T extends THREE.Object3D>(o: T) => { scene.add(o); return o }
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)); b.position.set(x, y, z); return b
  }
  // Light pools and contact shadows: a radial falloff computed in the shader.
  // (Not canvas gradients: Safari dithers those, and the additive light
  // amplified the dither into coloured speckles on the floor.)
  const radialVert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }'
  const radialFrag = 'uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; void main(){ float r = length(vUv - .5) * 2.; float a = 1. - smoothstep(0., 1., r); gl_FragColor = vec4(uColor, a * a * uOpacity); }'
  const glow = (kind: 'light' | 'shadow', w: number, d: number, x: number, z: number, y: number, opacity: number, color = '#ffd6aa') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(kind === 'light' ? color : '#000000') }, uOpacity: { value: opacity } },
      vertexShader: radialVert, fragmentShader: radialFrag, transparent: true, depthWrite: false,
      blending: kind === 'light' ? THREE.AdditiveBlending : THREE.NormalBlending,
    }))
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m); return m
  }

  // ─── Floor: a real mirror under a semi-opaque polished tile ───
  const reflScale = mobile ? 0.3 : 0.5
  const mirror = new Reflector(new THREE.PlaneGeometry(W, D), {
    textureWidth: Math.round(innerWidth * dpr * reflScale),
    textureHeight: Math.round(innerHeight * dpr * reflScale),
    color: 0x5a5a5a,
  })
  mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, 0, FRONT - D / 2)
  scene.add(mirror)
  const tile = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({
    map: floorTex(W / 2.4, D / 2.4), roughness: 0.3, metalness: 0, transparent: true, opacity: 0.72, envMapIntensity: 0.25,
  }))
  tile.rotation.x = -Math.PI / 2; tile.position.set(0, 0.002, FRONT - D / 2)
  scene.add(tile)

  // Street paving outside
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({ map: paverTex(9, 4.5), roughness: 0.55, envMapIntensity: 0.15 }))
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
  const CANOPY = 2.4, TOP = H + 0.7
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
  const stone = new THREE.Mesh(new THREE.PlaneGeometry(W + 16, 34), new THREE.MeshStandardMaterial({
    map: stoneTex, roughness: 0.85, emissiveMap: stoneTex, emissive: new THREE.Color('#5a4c3c'), emissiveIntensity: 0.55,
  }))
  stone.position.set(0, TOP + 17, FRONT + CANOPY); scene.add(stone)
  // canopy soffit: dark grey panels over the pavement, catching the shop light
  const soffitTex = canvasTex(512, 256, c => {
    c.fillStyle = '#2b2e31'; c.fillRect(0, 0, 512, 256); noise(c, 512, 256, 8)
    c.fillStyle = 'rgba(0,0,0,.6)'; for (let x = 0; x <= 512; x += 128) c.fillRect(x - 2, 0, 3, 256)
  }, [(W + 16) / 3, 1])
  const soffit = new THREE.Mesh(new THREE.PlaneGeometry(W + 16, CANOPY), new THREE.MeshStandardMaterial({ map: soffitTex, roughness: 0.7 }))
  soffit.rotation.x = Math.PI / 2 - 0.06; soffit.position.set(0, TOP - 0.05, FRONT + CANOPY / 2); scene.add(soffit)
  box(W + 16, 0.7, 0.3, mats.metal, 0, H + 0.35, FRONT - 0.1)     // head band above the glass
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

  // ─── The sign: the wide logo as supplied (white on black). Drawn additively,
  //     so the black adds nothing and only the letters light up and bloom. ───
  const loader = new THREE.TextureLoader()
  const signTex = loader.load(opts.signUrl)
  signTex.colorSpace = THREE.SRGBColorSpace; signTex.anisotropy = 16
  const signW = 7.2, signH = signW * (232 / 1283)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), new THREE.MeshBasicMaterial({
    map: signTex, color: new THREE.Color(1.5, 1.5, 1.5), blending: THREE.AdditiveBlending, transparent: true, toneMapped: false, depthWrite: false,
  }))
  // The wide logo is the page's header (DOM) above the building, so the
  // facade itself carries no sign
  sign.visible = false
  const logoTex = loader.load(opts.logoUrl)
  logoTex.colorSpace = THREE.SRGBColorSpace; logoTex.anisotropy = 8

  // Entrance mat with the logo, just inside
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 1 }))
  mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.006, FRONT - 1.3); scene.add(mat)
  const matLogo = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2 / (1189 / 553)), new THREE.MeshBasicMaterial({
    map: logoTex, transparent: true, color: '#9a9a9a', depthWrite: false,
  }))
  matLogo.rotation.x = -Math.PI / 2; matLogo.rotation.z = Math.PI; matLogo.position.set(0, 0.008, FRONT - 1.3); scene.add(matLogo)

  // ─── Columns: black gloss, two on the floor ───
  const colGeo = new THREE.CylinderGeometry(0.34, 0.34, H, 48)
  for (const [x, z] of [[-4.4, -7.2], [5.4, -15]]) {
    const c = new THREE.Mesh(colGeo, mats.gloss); c.position.set(x, H / 2, z); scene.add(c)
  }

  // ─── Ceiling spots + their light pools on the floor ───
  const spotGeo = new THREE.CircleGeometry(0.09, 24)
  const spotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.1, 1.7), toneMapped: false })
  const spots: [number, number][] = []
  for (let z = -2; z > -D + 1; z -= 3) for (let x = -7.5; x <= 7.5; x += 3.75) spots.push([x + ((z / 3) % 2 ? 0.9 : 0), z])
  const spotMesh = new THREE.InstancedMesh(spotGeo, spotMat, spots.length)
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))
  spots.forEach(([x, z], i) => {
    spotMesh.setMatrixAt(i, m4.compose(new THREE.Vector3(x, H - 0.01, z), q, new THREE.Vector3(1, 1, 1)))
    glow('light', 3.0, 3.0, x, z, 0.004, 0.16)
  })
  scene.add(spotMesh)
  // Interior spill onto the street
  glow('light', 22, 9, 0, FRONT + 3.2, 0.01, 0.3, '#ffd2a0')

  // ─── Light ───
  add(new THREE.HemisphereLight('#ffe2c4', '#141821', 0.22))
  for (const [x, z] of [[-5, -4], [5, -4], [-5, -13], [5, -13], [0, -20]]) {
    const l = new THREE.PointLight('#ffcf98', 5, 11, 1.8); l.position.set(x, H - 0.4, z); scene.add(l)
  }
  const moon = new THREE.DirectionalLight('#8ea6d6', 0.6); moon.position.set(-6, 10, 12); scene.add(moon)

  // ─── The stand: one gloss plinth in the middle of the hall, a light ring at
  //     its edge, and the gallery hovering above it ───
  const STAND = new THREE.Vector3(0, 0, -12.5)
  const N = opts.cards.length
  // card size (m), canvas 1024×832 — larger on a phone, where it must read at arm's length
  const CW = mobile ? 1.7 : 1.9, CH = CW * (832 / 1024)
  // The ring grows with the number of cars: every card gets a clear gap of
  // 35% of its width on each side, so no two cars ever touch
  const R = Math.max(3.0, (N * CW * 1.35) / (Math.PI * 2))
  const PR = R + 0.7                              // plinth radius
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR + 0.06, 0.08, 160), mats.gloss)
  plinth.position.set(STAND.x, 0.04, STAND.z); scene.add(plinth)
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.95, 1.6), toneMapped: false })
  const lightRing = new THREE.Mesh(new THREE.TorusGeometry(PR + 0.03, 0.014, 8, 256), ringMat)
  lightRing.rotation.x = Math.PI / 2; lightRing.position.set(STAND.x, 0.082, STAND.z); scene.add(lightRing)
  glow('shadow', PR * 2.4, PR * 2.4, STAND.x, STAND.z, 0.003, 0.45)
  glow('light', PR * 2.6, PR * 2.6, STAND.x, STAND.z, 0.084, 0.42)

  // ─── Back: glass offices with frosted bands ───
  const officeZ = FRONT - D + 4
  for (let x = -half + 2; x <= half - 2 + 0.01; x += 3) box(0.06, H, 0.08, mats.metal, x, H / 2, officeZ)
  const frosted = new THREE.MeshBasicMaterial({ map: stripeTex(), transparent: true, opacity: 0.55, depthWrite: false })
  const og = new THREE.Mesh(new THREE.PlaneGeometry(W - 4, H), frosted); og.position.set(0, H / 2, officeZ); scene.add(og)
  const og2 = new THREE.Mesh(new THREE.PlaneGeometry(W - 4, H), mats.glass); og2.position.set(0, H / 2, officeZ + 0.01); scene.add(og2)
  // lowered ceiling band over the offices (the real hall's bulkhead)
  box(W, 0.5, 6, mats.ceiling, 0, H - 0.25, officeZ + 1)

  // ─── Furniture from the real hall: the black accessories vitrine with its
  //     screen on the right wall, black sales desks along the left ───
  const black = new THREE.MeshStandardMaterial({ color: '#0d0e10', roughness: 0.35, metalness: 0.3 })
  const shelfGlass = new THREE.MeshStandardMaterial({ color: '#9fb0bf', roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.25 })
  const vx = half - 0.35, vz = -9.5
  box(0.5, 2.6, 0.06, black, vx, 1.3, vz - 1.2); box(0.5, 2.6, 0.06, black, vx, 1.3, vz + 1.2)
  box(0.5, 0.08, 2.46, black, vx, 2.6, vz); box(0.5, 0.3, 2.46, black, vx, 0.15, vz)
  for (const y of [0.85, 1.45, 2.05]) box(0.46, 0.02, 2.34, shelfGlass, vx, y, vz)
  const screenMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.5, 0.75) })
  box(0.06, 0.7, 1.2, black, half - 0.05, 3.3, vz)
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.62), screenMat); scr.rotation.y = -Math.PI / 2; scr.position.set(half - 0.09, 3.3, vz); scene.add(scr)
  for (const z of [-5.5, -9]) {
    box(1.6, 0.04, 0.8, black, -half + 1.6, 0.76, z)
    box(0.04, 0.74, 0.76, black, -half + 0.84, 0.37, z); box(0.04, 0.74, 0.76, black, -half + 2.36, 0.37, z)
    box(0.5, 0.3, 0.02, black, -half + 1.6, 1.0, z - 0.3)   // monitor
  }

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
    uniform sampler2D map; uniform float uDim; uniform float uAlpha; uniform float uReady; uniform vec2 uSize; varying vec2 vUv;
    float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
    void main(){
      vec2 p = (vUv - .5) * uSize;
      float d = rbox(p, uSize * .5, .055);
      float a = 1. - smoothstep(-.004, .002, d);
      vec3 col = mix(vec3(.075, .078, .085), texture2D(map, vUv).rgb, uReady);
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
      uniforms: { map: { value: null }, uDim: { value: 0 }, uAlpha: { value: 0 }, uReady: { value: 0 }, uSize: { value: new THREE.Vector2(CW, CH) } },
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
  composer.addPass(bloom)
  const tilt = new ShaderPass(TiltShift)
  if (!mobile) composer.addPass(tilt)
  composer.addPass(new OutputPass())

  // ─── Camera: street → doors → inside → stops facing the stand. A narrow
  //     (portrait) screen stops further back so the front card and its
  //     neighbours still fit. ───
  let path: THREE.CatmullRomCurve3, look: THREE.CatmullRomCurve3
  const buildPath = (aspect: number) => {
    // stop where the front card fills ~75% of a phone's width, ~40% of a desktop's
    const endZ = STAND.z + R + (aspect < 1 ? 3.6 : 3.4)
    path = new THREE.CatmullRomCurve3([
      // portrait starts closer, so the storefront sits right under the logo header
      new THREE.Vector3(0, 1.6, aspect < 1 ? 12 : 16), new THREE.Vector3(0, 1.58, aspect < 1 ? 6.5 : 8), new THREE.Vector3(0, 1.55, 1.6),
      new THREE.Vector3(0.35, 1.58, (1.6 + endZ) / 2), new THREE.Vector3(0, 1.62, endZ),
    ], false, 'centripetal')
    look = new THREE.CatmullRomCurve3([
      // the storefront sits mid-frame under the logo header; the stone above fades out
      new THREE.Vector3(0, aspect < 1 ? 1.7 : 2.3, 0), new THREE.Vector3(0, 2.1, -6), new THREE.Vector3(0, 1.75, STAND.z),
      new THREE.Vector3(0, 1.62, STAND.z), new THREE.Vector3(0, 1.58, STAND.z),
    ], false, 'centripetal')
  }

  // Progress map: 0 → .82 the walk in, .72 → .9 the gallery rises over the
  // stand. That is where the page scroll ends: the gallery itself only turns
  // sideways — finger, mouse or arrows — and always rests on a card.
  const WALK = 0.82
  let progress = 0, shown = -1, dirty = true, time = 0
  let drag = 0, angle = 0, dragging = false, front = -1
  const pointer = new THREE.Vector2(), pointerS = new THREE.Vector2()
  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3()


  function place(p: number, dt: number) {
    const t = smooth(fit(p, 0, WALK))
    path.getPointAt(t, tmpP); look.getPointAt(t, tmpL)
    tmpL.x += pointerS.x * 0.5; tmpL.y += pointerS.y * 0.25
    camera.position.copy(tmpP); camera.lookAt(tmpL)
    const open = smooth(fit(p, 0.2, 0.45))
    doors.forEach((d, i) => {
      const s = i === 0 ? -1 : 1
      d.position.x = s * (0.6 + open * 1.15)
      ;(d.userData.frame as THREE.Mesh).position.x = s * (1.2 + open * 1.15)
    })
    renderer.toneMappingExposure = 0.9 + 0.12 * fit(p, 0.3, 0.6)
    bloom.strength = 0.6 - 0.25 * fit(p, 0.4, 0.7)

    // Gallery: rises out of the stand card by card, then floats
    const target = drag
    angle += (target - angle) * (dragging ? 1 : 1 - Math.exp(-dt * 9))
    ring.rotation.y = angle
    ring.position.y = 1.72 + Math.sin(time * 0.9) * 0.035
    cardMeshes.forEach((m, i) => {
      let th = (-i * STEP + angle) % (Math.PI * 2)
      if (th > Math.PI) th -= Math.PI * 2
      if (th < -Math.PI) th += Math.PI * 2
      const u = m.material.uniforms
      const rise = smooth(fit(p, 0.72 + (Math.abs(th) / Math.PI) * 0.06, 0.84 + (Math.abs(th) / Math.PI) * 0.06))
      u.uAlpha.value = rise
      m.position.y = (1 - rise) * -0.9
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

  // ─── Touch / mouse: drag the ring sideways (vertical stays page scroll),
  //     release projects the velocity and settles on the nearest card; a tap
  //     on the front card opens it, on another card brings it to the front ───
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2()
  let downX = 0, downY = 0, lastX = 0, lastT = 0, vel = 0, moved = false
  const settle = () => {
    drag = Math.round(drag / STEP) * STEP
  }
  const onDown = (e: PointerEvent) => {
    if (progress < WALK - 0.04) return
    dragging = true; moved = false; downX = lastX = e.clientX; downY = e.clientY; lastT = performance.now(); vel = 0
  }
  const onMove = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - lastX, now = performance.now()
    if (!moved) {
      const ax = Math.abs(e.clientX - downX), ay = Math.abs(e.clientY - downY)
      if (ay > ax && ay > 6) { dragging = false; return }   // a vertical gesture: not ours
      if (ax < 8) return
      moved = true
    }
    const k = STEP / Math.max(160, canvas.clientWidth * 0.32)   // one card per ~third of the screen
    drag -= dx * k                                              // the ring follows the finger
    vel = (-dx * k) / Math.max(1, now - lastT) * 1000
    lastX = e.clientX; lastT = now; dirty = true
  }
  const onUp = (e: PointerEvent) => {
    if (!dragging) return
    dragging = false
    if (moved) { drag += vel * 0.18; settle(); dirty = true; return }   // momentum projection
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
  let last = performance.now(), raf = 0, running = true
  const tick = (now: number) => {
    if (!running) return
    raf = requestAnimationFrame(tick)
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt
    pointerS.lerp(pointer, 1 - Math.exp(-dt * 4))
    if (progress > 0.45) loadCards()
    const floating = progress > 0.7
    const moving = floating || dirty || Math.abs(progress - shown) > 1e-5 || pointerS.distanceToSquared(pointer) > 1e-6
    if (!moving) return
    dirty = false
    place(progress, dt); shown = progress
    composer.render()
    frames.push(dt * 1000); if (frames.length > 600) frames.shift()
  }
  raf = requestAnimationFrame(tick)

  return {
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
