'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Card, SceneHandle } from './scene'
import { INSTAGRAM_URL } from '@/lib/agent-format'

const WHATSAPP = 'https://wa.me/97299561906'
// the hall's Facebook page, as linked from the main site
const FACEBOOK = 'https://www.facebook.com/bavarianmotorsclub'

const fit = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)))

// One gesture walks you in: a scroll, a swipe up or the arrow key plays the
// whole entrance (street → doors → the stand) as one continuous move; the
// opposite gesture walks you back out. The page itself never scrolls. Inside,
// the gallery turns only sideways: finger, mouse or the arrows.
export default function Showroom({ cards }: { cards: Card[] }) {
  const router = useRouter()
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const cap = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const floor = useRef<HTMLDivElement>(null)
  const goRef = useRef<(dest: 0 | 1) => void>(() => {})
  const nav = useRef<HTMLElement>(null)
  const arrows = useRef<HTMLDivElement>(null)
  const sign = useRef<HTMLDivElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const handle = useRef<SceneHandle | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [front, setFront] = useState(0)
  // a fresh random order on every refresh: stock and on-the-way, mixed
  const [deck] = useState(() => {
    const d = [...cards]
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); ;[d[i], d[j]] = [d[j], d[i]] }
    return d
  })
  const [menu, setMenu] = useState(false)
  const menuOpen = useRef(false)
  menuOpen.current = menu

  useEffect(() => {
    const cv = canvas.current!
    if (!cv.getContext('webgl2')) { setState('fallback'); return }

    const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 900
    // two remembered states: a refresh while inside opens inside
    let inside = false
    try { inside = sessionStorage.getItem('sr-view') === 'in' } catch {}
    let current = inside ? 1 : 0, vel = 0, target = inside ? 1 : 0, last = performance.now(), raf = 0, alive = true
    // the walk: a timed ease of the target from where it is to 0 (outside) or
    // 1 (inside). A gesture the other way turns it around at any moment.
    let from = 0, to = 0, t0 = 0, dur = 0
    const DUR = mobile ? 3200 : 3600
    // moves at once and slows into the arrival (the spring below softens the start)
    const ease = (x: number) => 1 - (1 - x) ** 3
    const go = (dest: 0 | 1) => {
      if (dur ? to === dest : target === dest) return
      from = target; to = dest; t0 = performance.now(); dur = DUR * Math.abs(dest - target)
      try { sessionStorage.setItem('sr-view', dest === 1 ? 'in' : 'out') } catch {}
    }
    goRef.current = go
    const frame = (now: number) => {
      if (!alive) return
      raf = requestAnimationFrame(frame)
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now
      if (dur) {
        const k = Math.min(1, (now - t0) / dur)
        target = from + (to - from) * ease(k)
        if (k >= 1) { target = to; dur = 0 }
      }
      // the camera follows the target on a critically damped spring, so a
      // turn back eases through instead of snapping
      const w = 2 / 0.12, x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
      const off = current - target, tmp = (vel + w * off) * dt
      vel = (vel - w * tmp) * e
      current = Math.min(1, Math.max(0, target + (off + tmp) * e))
      if (!dur && Math.abs(current - target) < 1e-4 && Math.abs(vel) < 1e-3) { current = target; vel = 0 }
      handle.current?.setProgress(current)
      const c = cap.current
      if (c) {
        const s = fit(current, 0.86, 0.93)
        c.style.opacity = String(s); c.style.visibility = s > 0.01 ? 'visible' : 'hidden'
        c.style.transform = `translateY(${(1 - s) * 14}px)`
        const a = arrows.current
        if (a) { a.style.opacity = String(s); a.style.visibility = s > 0.01 ? 'visible' : 'hidden' }
      }
      // The sign lives on the building; the site's bar slides in as you walk through the doors
      if (nav.current) {
        const l = fit(current, 0.42, 0.6)
        nav.current.style.opacity = String(l); nav.current.style.visibility = l > 0.01 ? 'visible' : 'hidden'
        nav.current.style.transform = `translateY(${(1 - l) * -10}px)`
      }
      if (bar.current) bar.current.style.transform = `scaleX(${current})`
      // the street's buttons give way as soon as you step in
      if (floor.current) { const f = 1 - fit(current, 0.02, 0.1); floor.current.style.opacity = String(f); floor.current.style.visibility = f > 0.01 ? 'visible' : 'hidden' }
    }

    const onPointer = (e: PointerEvent) => handle.current?.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1))
    let rTimer = 0
    // Resize at once (a delayed resize showed a stretched frame while turning
    // the phone), and again once Safari has settled its bars after a rotation
    const onResize = () => { handle.current?.resize(); clearTimeout(rTimer); rTimer = window.setTimeout(() => handle.current?.resize(), 350) }
    // gestures: wheel, a vertical swipe, keys. Inside, a sideways scroll turns
    // the gallery by one card per gesture (a trackpad's long tail counts once)
    let wheelLock = false, wheelTimer = 0
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (menuOpen.current) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        clearTimeout(wheelTimer); wheelTimer = window.setTimeout(() => { wheelLock = false }, 180)
        if (current > 0.95 && !wheelLock && Math.abs(e.deltaX) > 6) { wheelLock = true; handle.current?.step(e.deltaX > 0 ? -1 : 1) }
        return
      }
      if (Math.abs(e.deltaY) > 4) go(e.deltaY > 0 ? 1 : 0)
    }
    let ty = 0, tx = 0
    const onTouchStart = (e: TouchEvent) => { ty = e.touches[0].clientY; tx = e.touches[0].clientX }
    const onTouchMove = (e: TouchEvent) => { if (!menuOpen.current) e.preventDefault() }
    const onTouchEnd = (e: TouchEvent) => {
      if (menuOpen.current) return
      const dy = e.changedTouches[0].clientY - ty, dx = e.changedTouches[0].clientX - tx
      if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx)) go(dy < 0 ? 1 : 0)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenu(false); return }
      if (menuOpen.current) return
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1) }
      if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(0) }
    }

    import('./scene').then(({ createShowroom }) => {
      if (!alive) return
      try {
        handle.current = createShowroom(cv, {
          mobile, cards: deck,
          logoUrl: '/brand/logo-light.png',
          // the sign rides on its spot of the stone: centre and width come from the scene
          onSign: (x, y, w, fade) => {
            const el = sign.current; if (!el) return
            // The haze: walking up, the sign rises past the top of the screen while
            // the scene scales it up many times, and its halo (scaled with it)
            // spilled into view as a white glow with no letters. It fades out on its
            // way to the top edge, before it leaves the screen, and before it grows
            const f = fade * fit(y, innerHeight * 0.04, innerHeight * 0.16) * (1 - fit(w, innerWidth * 1.1, innerWidth * 1.6))
            el.style.visibility = f > 0.01 ? 'visible' : 'hidden'
            el.style.opacity = String(f)
            el.style.transform = `translate3d(${x - 500}px, ${y - 500 * (232 / 1283)}px, 0) scale(${w / 1000})`
          },
          font: getComputedStyle(root.current!).fontFamily,
          onGallery: y => {
            if (arrows.current) arrows.current.style.top = `${y}px`
          },
          onReady: () => setState('ready'),
          onEnter: () => goRef.current(1),
          onFront: setFront,
          onOpen: i => { const c = deck[i]; if (c.external) location.href = c.href; else router.push(c.href) },
        })
        ;(window as unknown as { __showroom: SceneHandle }).__showroom = handle.current
      } catch { setState('fallback') }
    })

    addEventListener('wheel', onWheel, { passive: false })
    addEventListener('touchstart', onTouchStart, { passive: true })
    addEventListener('touchmove', onTouchMove, { passive: false })
    addEventListener('touchend', onTouchEnd)
    addEventListener('keydown', onKey)
    addEventListener('resize', onResize)
    addEventListener('orientationchange', onResize)
    visualViewport?.addEventListener('resize', onResize)
    addEventListener('pointermove', onPointer, { passive: true })
    raf = requestAnimationFrame(frame)
    return () => {
      alive = false; cancelAnimationFrame(raf)
      removeEventListener('wheel', onWheel); removeEventListener('touchstart', onTouchStart); removeEventListener('touchmove', onTouchMove)
      removeEventListener('touchend', onTouchEnd); removeEventListener('keydown', onKey)
      removeEventListener('resize', onResize); removeEventListener('orientationchange', onResize); visualViewport?.removeEventListener('resize', onResize)
      removeEventListener('pointermove', onPointer)
      handle.current?.dispose(); handle.current = null
    }
  }, [deck, router])

  const card = deck[front]

  return (
    <div ref={root} className="sr" data-state={state}>
      {/* Safari 26 looks at what is fixed at the very top edge to decide what to draw
          behind the clock; a transparent, click-through strip there lets the page show */}
      <div ref={strip} className="sr-safari-strip" aria-hidden="true" />
      <div className="sr-track">
        <div className="sr-stage">
          <canvas ref={canvas} className="sr-canvas" aria-label="אולם התצוגה של בוואריאן מוטורס" role="img" />

          {/* the frame rides on the stone; the letters inside come on: a little
              small and dim first, then grown to full size and full light */}
          <div ref={sign} className="sr-sign" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="sr-sign-img" src="/brand/logo-wide-light.png" alt="" width={1000} height={181} />
          </div>

          {/* The site's bar, in the hall's dark: menu at the start, the long logo at the end */}
          <header ref={nav} className="sr-top">
            <button type="button" className="sr-burger" aria-label={menu ? 'סגירת התפריט' : 'תפריט'} aria-expanded={menu} aria-controls="sr-menu" onClick={() => setMenu(m => !m)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {menu
                  ? <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  : <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
              </svg>
            </button>
            <Link href="/" className="sr-logo" aria-label="בוואריאן מוטורס">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-wide-light.png" alt="" width={1283} height={232} />
            </Link>
          </header>

          {/* the menu: the site's pages */}
          <nav id="sr-menu" className="sr-menu" data-open={menu} aria-label="ניווט ראשי" hidden={!menu}>
            <Link href="/cars" onClick={() => setMenu(false)}>הרכבים</Link>
            <Link href="/sold" onClick={() => setMenu(false)}>רכבים שנמכרו</Link>
            <Link href="/team" onClick={() => setMenu(false)}>הצוות</Link>
            <Link href="/contact" onClick={() => setMenu(false)}>צרו קשר</Link>
          </nav>

          {/* On the street, over the pavement: the way in and the site's other doors.
              "כל הרכבים" walks you into the hall, where the cars are. */}
          <div ref={floor} className="sr-floor">
            {/* only the way in hovers; the line of words below stays put */}
            <div className="sr-hover">
              <button type="button" className="sr-enter" onClick={() => goRef.current(1)}>
                כל הרכבים
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            {/* one line of the site's other doors: the pages, then the hall's channels */}
            <div className="sr-line">
            <nav className="sr-doors" aria-label="עמודי האתר">
              <Link href="/sold">רכבים שנמכרו</Link>
              <Link href="/team">הצוות</Link>
              <Link href="/contact">צרו קשר</Link>
            </nav>
            <div className="sr-social">
              {/* white line marks from one family, the same size and weight, lit like the rest of the street */}
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label="וואטסאפ">
                {/* a touch smaller than Instagram's: its bubble spans more of the box than the square */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" />
                  <path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" />
                </svg>
              </a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="אינסטגרם">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="4" width="16" height="16" rx="4" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M16.5 7.5v.01" />
                </svg>
              </a>
              <a href={FACEBOOK} target="_blank" rel="noopener noreferrer" aria-label="פייסבוק">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3" />
                </svg>
              </a>
            </div>
            </div>
          </div>

          {/* the arrows stand beside the turning gallery, at the height of its front card */}
          <div ref={arrows} className="sr-arrows">
            <button type="button" className="sr-arrow" aria-label="הקודם" onClick={() => handle.current?.step(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" className="sr-arrow" aria-label="הבא" onClick={() => handle.current?.step(1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>

          {/* the front card's name over the floor; tapping the card (or the name) opens it */}
          {card && (
            <div ref={cap} className="sr-cap" aria-live="polite">
              {/* keyed by the card: a short fade from blur as the next one comes to the front */}
              <div key={front} className="sr-cap-in">
              {card.external
                ? <a href={card.href} className="sr-name" target="_blank" rel="noopener noreferrer">{card.title}</a>
                : <Link href={card.href} className="sr-name">{card.title}</Link>}
              </div>
            </div>
          )}

          <div className="sr-progress" aria-hidden="true"><div ref={bar} /></div>
          {state === 'fallback' && (
            <div className="sr-fallback">
              <p>האולם התלת-ממדי לא נתמך במכשיר הזה.</p>
              <Link href="/cars" className="sr-cta">לכל הרכבים</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
