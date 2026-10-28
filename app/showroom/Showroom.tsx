'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Card, SceneHandle } from './scene'

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
  const hint = useRef<HTMLParagraphElement>(null)
  const logo = useRef<HTMLAnchorElement>(null)
  const head = useRef<HTMLDivElement>(null)
  const top = useRef<HTMLElement>(null)
  const handle = useRef<SceneHandle | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [front, setFront] = useState(0)

  useEffect(() => {
    const cv = canvas.current!
    if (!cv.getContext('webgl2')) { setState('fallback'); return }

    const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 900
    let current = 0, raf = 0, alive = true
    // the walk: a timed ease from where we are to 0 (outside) or 1 (inside)
    let from = 0, to = 0, t0 = 0, dur = 0
    const DUR = mobile ? 3200 : 3600
    const easeInOut = (x: number) => 0.5 - Math.cos(Math.PI * x) / 2
    const go = (dest: 0 | 1) => {
      if (dur && performance.now() - t0 < dur) return          // one walk at a time
      if (current === dest) return
      from = current; to = dest; t0 = performance.now(); dur = DUR * Math.abs(dest - current)
    }
    const frame = (now: number) => {
      if (!alive) return
      raf = requestAnimationFrame(frame)
      if (dur) {
        const k = Math.min(1, (now - t0) / dur)
        current = from + (to - from) * easeInOut(k)
        if (k >= 1) { current = to; dur = 0 }
      }
      handle.current?.setProgress(current)
      const c = cap.current
      if (c) {
        const s = fit(current, 0.86, 0.93)
        c.style.opacity = String(s); c.style.visibility = s > 0.01 ? 'visible' : 'hidden'
        c.style.transform = `translateY(${(1 - s) * 14}px)`
      }
      // Outside, the wide logo is the page's header; it lifts away as the doors
      // open, and the compact logo takes its place in the bar once inside
      if (head.current) { const h = fit(current, 0.14, 0.34); head.current.style.opacity = String(1 - h); head.current.style.transform = `translateY(${-h * 40}px)`; head.current.style.visibility = h < 0.99 ? 'visible' : 'hidden'
        // the bar sits under the header outside and rises to the top once inside
        if (top.current) top.current.style.transform = `translateY(${(1 - h) * head.current.offsetHeight}px)` }
      if (logo.current) { const l = fit(current, 0.4, 0.5); logo.current.style.opacity = String(l); logo.current.style.visibility = l > 0.01 ? 'visible' : 'hidden' }
      if (bar.current) bar.current.style.transform = `scaleX(${current})`
      if (hint.current) hint.current.style.opacity = String(1 - fit(current, 0.02, 0.08))
    }

    const onPointer = (e: PointerEvent) => handle.current?.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1))
    let rTimer = 0
    const onResize = () => { clearTimeout(rTimer); rTimer = window.setTimeout(() => handle.current?.resize(), 150) }
    // gestures: wheel, a vertical swipe, keys
    const onWheel = (e: WheelEvent) => { e.preventDefault(); if (Math.abs(e.deltaY) > 4) go(e.deltaY > 0 ? 1 : 0) }
    let ty = 0, tx = 0
    const onTouchStart = (e: TouchEvent) => { ty = e.touches[0].clientY; tx = e.touches[0].clientX }
    const onTouchMove = (e: TouchEvent) => { e.preventDefault() }
    const onTouchEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - ty, dx = e.changedTouches[0].clientX - tx
      if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx)) go(dy < 0 ? 1 : 0)
    }
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1) }
      if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(0) }
    }

    import('./scene').then(({ createShowroom }) => {
      if (!alive) return
      try {
        handle.current = createShowroom(cv, {
          mobile, cards,
          logoUrl: '/brand/logo-light.png',
          signUrl: '/brand/logo-wide-light.jpg',
          font: getComputedStyle(root.current!).fontFamily,
          onFront: setFront,
          onOpen: i => { const c = cards[i]; if (c.external) location.href = c.href; else router.push(c.href) },
        })
        ;(window as unknown as { __showroom: SceneHandle }).__showroom = handle.current
        setState('ready')
      } catch { setState('fallback') }
    })

    addEventListener('wheel', onWheel, { passive: false })
    addEventListener('touchstart', onTouchStart, { passive: true })
    addEventListener('touchmove', onTouchMove, { passive: false })
    addEventListener('touchend', onTouchEnd)
    addEventListener('keydown', onKey)
    addEventListener('resize', onResize)
    addEventListener('pointermove', onPointer, { passive: true })
    raf = requestAnimationFrame(frame)
    return () => {
      alive = false; cancelAnimationFrame(raf)
      removeEventListener('wheel', onWheel); removeEventListener('touchstart', onTouchStart); removeEventListener('touchmove', onTouchMove)
      removeEventListener('touchend', onTouchEnd); removeEventListener('keydown', onKey)
      removeEventListener('resize', onResize); removeEventListener('pointermove', onPointer)
      handle.current?.dispose(); handle.current = null
    }
  }, [cards, router])

  const card = cards[front]

  return (
    <div ref={root} className="sr" data-state={state}>
      <div className="sr-track">
        <div className="sr-stage">
          <canvas ref={canvas} className="sr-canvas" aria-label="אולם התצוגה של בוואריאן מוטורס" role="img" />

          <header ref={top} className="sr-top">
            <Link ref={logo} href="/cars" className="sr-logo" aria-label="בוואריאן מוטורס">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-full-light-sm.png" alt="" width={420} height={195} />
            </Link>
          </header>

          <div ref={head} className="sr-head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-wide-light.png" alt="Bavarian Motors Club" width={1283} height={232} />
          </div>

          <p ref={hint} className="sr-hint">גללו כדי להיכנס</p>

          {card && (
            <div ref={cap} className="sr-cap" aria-live="polite">
              <div className="sr-cap-text">
                <p className="sr-count"><bdi>{front + 1} / {cards.length}</bdi></p>
                <p className="sr-name">{card.title}</p>
                <p className="sr-price"><bdi>{card.sub}</bdi></p>
              </div>
              <div className="sr-actions">
                <button type="button" className="sr-arrow" aria-label="הקודם" onClick={() => handle.current?.step(-1)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                {card.external
                  ? <a href={card.href} className="sr-cta" target="_blank" rel="noopener noreferrer">פתיחה</a>
                  : <Link href={card.href} className="sr-cta">כניסה</Link>}
                <button type="button" className="sr-arrow" aria-label="הבא" onClick={() => handle.current?.step(1)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
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
