'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AgentMedia from './AgentMedia'
import Room from './Room'
import { FROM_TEAM_KEY } from './keys'

export type TeamAgent = { publicId: string; name: string; title: string | null; photoUrl: string | null }

const INDEX_KEY = 'sr-team-index'

// Apple's scroll-deceleration projection: where a flick would come to rest.
function project(velocityPxPerSec: number, rate = 0.994) {
  return (velocityPxPerSec / 1000) * rate / (1 - rate)
}

// Progressive resistance past the first/last agent instead of a hard stop.
function rubber(x: number, min: number, max: number) {
  if (x < min) { const o = min - x; return min - (o * 0.55) / (1 + o * 0.55) }
  if (x > max) { const o = x - max; return max + (o * 0.55) / (1 + o * 0.55) }
  return x
}

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d={dir === 'right' ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function TeamShowroom({ agents }: { agents: TeamAgent[] }) {
  const router = useRouter()
  const N = agents.length
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const slotRefs = useRef<(HTMLDivElement | null)[]>([])
  // Motion state lives outside React: the carousel renders every frame by
  // writing transforms directly, never through a re-render.
  const m = useRef({ pos: 0, vel: 0, target: 0, dragging: false, cw: 200, sp: 200, raf: 0, last: 0, running: false })
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(0)
  const [swap, setSwap] = useState(false)
  const [lightsOn, setLightsOn] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const reduce = useRef(false)

  const render = useCallback(() => {
    const { pos, sp } = m.current
    for (let i = 0; i < N; i++) {
      const el = slotRefs.current[i]
      if (!el) continue
      const o = i - pos
      const a = Math.abs(o)
      const x = -o * sp // RTL: the next agent waits on the left
      const rot = Math.max(-55, Math.min(55, o * 32))
      const z = -Math.min(a, 3) * 140
      const sc = 1 - Math.min(a, 2) * 0.1
      el.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${rot}deg) scale(${sc})`
      el.style.opacity = String(a > 2.6 ? 0 : 1 - Math.max(0, a - 1.4) * 0.7)
      el.style.zIndex = String(100 - Math.round(a * 10))
      el.style.visibility = a > 2.7 ? 'hidden' : 'visible'
      ;(el.querySelector('.sr-gloss') as HTMLElement | null)?.style.setProperty('--gx', `${o * 140 - 10}%`)
    }
    const idx = Math.max(0, Math.min(N - 1, Math.round(pos)))
    setIndex(prev => (prev === idx ? prev : idx))
  }, [N])

  const tick = useCallback((t: number) => {
    const s = m.current
    const dt = Math.min(0.032, (t - s.last) / 1000 || 0.016)
    s.last = t
    if (!s.dragging) {
      const k = 170, c = 2 * Math.sqrt(k) // critically damped spring
      s.vel += (k * (s.target - s.pos) - c * s.vel) * dt
      s.pos += s.vel * dt
      if (Math.abs(s.target - s.pos) < 0.0005 && Math.abs(s.vel) < 0.001) { s.pos = s.target; s.vel = 0 }
    }
    render()
    if (s.dragging || s.pos !== s.target || s.vel !== 0) {
      s.raf = requestAnimationFrame(tick)
    } else {
      s.running = false
    }
  }, [render])

  const kick = useCallback(() => {
    const s = m.current
    if (s.running) return
    s.running = true
    s.last = performance.now()
    s.raf = requestAnimationFrame(tick)
  }, [tick])

  const go = useCallback((i: number) => {
    m.current.target = Math.max(0, Math.min(N - 1, i))
    if (reduce.current) { m.current.pos = m.current.target; m.current.vel = 0 }
    kick()
  }, [N, kick])

  const open = useCallback((i: number) => {
    const a = agents[i]
    if (!a || leaving) return
    try {
      sessionStorage.setItem(FROM_TEAM_KEY, '1')
      sessionStorage.setItem(INDEX_KEY, String(i))
    } catch {}
    setLeaving(true)
    setTimeout(() => router.push(`/team/${a.publicId}`), reduce.current ? 0 : 240)
  }, [agents, leaving, router])

  // Mount: restore position, measure, lights on.
  useEffect(() => {
    reduce.current = matchMedia('(prefers-reduced-motion: reduce)').matches
    let start = 0
    try { start = Math.max(0, Math.min(N - 1, Number(sessionStorage.getItem(INDEX_KEY)) || 0)) } catch {}
    m.current.pos = m.current.target = start
    setIndex(start)
    setShown(start)

    const measure = () => {
      const stage = stageRef.current, root = rootRef.current
      if (!stage || !root) return
      const h = stage.clientHeight, w = window.innerWidth
      const cw = Math.max(120, Math.min(w * 0.52, h * 0.62, 300))
      m.current.cw = cw
      m.current.sp = cw * (w < 700 ? 0.82 : 1.02)
      trackRef.current?.style.setProperty('--cw', `${cw}px`)
      const r = stage.getBoundingClientRect()
      root.style.setProperty('--hz', `${r.top + r.height / 2 + cw * 0.52}px`)
      render()
    }
    measure()
    window.addEventListener('resize', measure)
    const lights = setTimeout(() => setLightsOn(true), reduce.current ? 0 : 200)

    // Returning via the back button can restore this page from bfcache with
    // the "leaving" state still applied.
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) setLeaving(false) }
    window.addEventListener('pageshow', onShow)

    const s = m.current
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('pageshow', onShow)
      clearTimeout(lights)
      cancelAnimationFrame(s.raf)
      s.running = false
    }
  }, [N, render])

  // Caption: blur-swap to the agent now in the spotlight.
  useEffect(() => {
    if (index === shown) return
    if (reduce.current) { setShown(index); return }
    setSwap(true)
    const t = setTimeout(() => { setShown(index); setSwap(false) }, 140)
    return () => clearTimeout(t)
  }, [index, shown])

  // Warm the next page while the visitor is looking at this agent.
  useEffect(() => {
    if (agents[index]) router.prefetch(`/team/${agents[index].publicId}`)
  }, [index, agents, router])

  // Keyboard: arrows move (RTL), Enter opens.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(Math.round(m.current.target) + 1)
      else if (e.key === 'ArrowRight') go(Math.round(m.current.target) - 1)
      else if (e.key === 'Enter' && document.activeElement === document.body) open(Math.round(m.current.target))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, open])

  // Drag: 1:1 tracking with velocity history; release projects momentum and
  // snaps to the agent nearest where the flick would land.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || N === 0) return
    let pid: number | null = null, sx = 0, spos = 0, moved = false
    let hist: { x: number; t: number }[] = []

    const down = (e: PointerEvent) => {
      if (pid !== null) return // ignore a second finger
      pid = e.pointerId
      stage.setPointerCapture(pid)
      const s = m.current
      s.dragging = true; s.vel = 0
      moved = false; sx = e.clientX; spos = s.pos
      hist = [{ x: e.clientX, t: e.timeStamp }]
      kick()
    }
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      const dx = e.clientX - sx
      if (Math.abs(dx) > 8) moved = true
      m.current.pos = rubber(spos + dx / m.current.sp, 0, N - 1)
      hist.push({ x: e.clientX, t: e.timeStamp })
      if (hist.length > 6) hist.shift()
    }
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      pid = null
      const s = m.current
      s.dragging = false
      if (!moved) {
        const slot = (e.target as HTMLElement).closest('.sr-slot')
        const i = slot ? slotRefs.current.indexOf(slot as HTMLDivElement) : -1
        if (i >= 0 && i === Math.round(s.pos)) { s.target = i; open(i) }
        else if (i >= 0) go(i)
        else go(Math.round(s.pos))
        return
      }
      const a = hist[0], b = hist[hist.length - 1]
      const vpx = ((b.x - a.x) / Math.max(1, b.t - a.t)) * 1000
      s.vel = reduce.current ? 0 : vpx / s.sp
      go(Math.round(s.pos + project(vpx) / s.sp))
    }
    stage.addEventListener('pointerdown', down)
    stage.addEventListener('pointermove', move)
    stage.addEventListener('pointerup', up)
    stage.addEventListener('pointercancel', up)
    return () => {
      stage.removeEventListener('pointerdown', down)
      stage.removeEventListener('pointermove', move)
      stage.removeEventListener('pointerup', up)
      stage.removeEventListener('pointercancel', up)
    }
  }, [N, go, kick, open])

  const current = agents[shown]
  const firstName = current?.name.split(' ')[0] ?? ''

  return (
    <div ref={rootRef} className={`sr${lightsOn ? ' sr-on' : ''}`}>
      <Room />
      <main className={`sr-view sr-team${leaving ? ' sr-leaving' : ''}`}>
        <div className="sr-topbar">
          <span className="sr-label">Showroom</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sr-logo" src="/LOGO.webp" alt="Bavarian Motors" />
          <span className="sr-label">The Team</span>
        </div>

        <header className="sr-head">
          <span className="sr-label">Bavarian Motors · Advisors</span>
          <h1>הכירו את <b>הצוות</b></h1>
        </header>

        {N === 0 ? (
          <div className="sr-empty"><p>הצוות שלנו יוצג כאן בקרוב</p></div>
        ) : (
          <>
            <div ref={stageRef} className="sr-stage" aria-roledescription="קרוסלה" aria-label="חברי הצוות">
              <div className="sr-spot" />
              <div ref={trackRef} className="sr-track">
                {agents.map((a, i) => (
                  <div key={a.publicId} ref={el => { slotRefs.current[i] = el }} className="sr-slot" aria-hidden={i !== index}>
                    <div className="sr-plinth" />
                    <div className="sr-reflect"><AgentMedia name={a.name} photoUrl={a.photoUrl} /></div>
                    <div className="sr-card">
                      <AgentMedia name={a.name} photoUrl={a.photoUrl} eager={Math.abs(i - index) < 3} />
                      <span className="sr-gloss" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sr-caption" aria-live="polite">
              <div className={`sr-cap${swap ? ' sr-swap' : ''}`}>
                <div className="sr-cap-name">{current?.name}</div>
                <div className="sr-cap-title">{current?.title || ' '}</div>
              </div>
            </div>

            <div className="sr-controls">
              <button className="sr-round" aria-label="הקודם" onClick={() => go(Math.round(m.current.target) - 1)} disabled={index === 0}>
                <Chevron dir="right" />
              </button>
              <button className="sr-cta" onClick={() => open(shown)}>
                <span>לכרטיס של {firstName}</span>
                <Chevron dir="left" />
              </button>
              <button className="sr-round" aria-label="הבא" onClick={() => go(Math.round(m.current.target) + 1)} disabled={index === N - 1}>
                <Chevron dir="left" />
              </button>
            </div>
            <div className="sr-counter"><b>{String(index + 1).padStart(2, '0')}</b> / {String(N).padStart(2, '0')}</div>
          </>
        )}
      </main>
    </div>
  )
}
