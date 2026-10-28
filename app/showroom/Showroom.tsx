'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Card, SceneHandle } from './scene'

const fit = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)))

// Scroll drives one progress value (0–1) through a tall track; the stage is
// sticky and the page scroll stays native (no hijack). Desktop eases toward
// the scroll position (a wheel moves in steps); a finger is already
// continuous, so the phone follows it 1:1.
//   0  → .5   the street, the sign, the doors, the walk in to the stand
//   .4 → .55  the gallery rises over the stand
//   .56 → .98 scrolling turns the gallery car by car (drag and the arrows too)
export default function Showroom({ cards }: { cards: Card[] }) {
  const router = useRouter()
  const root = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const cap = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const hint = useRef<HTMLParagraphElement>(null)
  const logo = useRef<HTMLAnchorElement>(null)
  const handle = useRef<SceneHandle | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [front, setFront] = useState(0)

  useEffect(() => {
    const cv = canvas.current!, tr = track.current!
    if (!cv.getContext('webgl2')) { setState('fallback'); return }

    const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 900
    let target = 0, current = 0, raf = 0, last = performance.now(), alive = true

    const read = () => {
      const max = tr.offsetHeight - innerHeight
      target = max > 0 ? Math.min(1, Math.max(0, -tr.getBoundingClientRect().top / max)) : 0
    }
    const frame = (now: number) => {
      if (!alive) return
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      current = mobile ? target : current + (target - current) * (1 - Math.exp(-dt * 7))
      if (Math.abs(target - current) < 1e-4) current = target
      handle.current?.setProgress(current)
      const c = cap.current
      if (c) {
        const s = fit(current, 0.5, 0.56)
        c.style.opacity = String(s); c.style.visibility = s > 0.01 ? 'visible' : 'hidden'
        c.style.transform = `translateY(${(1 - s) * 14}px)`
      }
      if (logo.current) { const l = fit(current, 0.3, 0.4); logo.current.style.opacity = String(l); logo.current.style.visibility = l > 0.01 ? 'visible' : 'hidden' }
      if (bar.current) bar.current.style.transform = `scaleX(${current})`
      if (hint.current) hint.current.style.opacity = String(1 - fit(current, 0.02, 0.08))
    }

    const onPointer = (e: PointerEvent) => handle.current?.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1))
    let rTimer = 0
    const onResize = () => { clearTimeout(rTimer); rTimer = window.setTimeout(() => { handle.current?.resize(); read() }, 150) }

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
        read(); setState('ready')
      } catch { setState('fallback') }
    })

    addEventListener('scroll', read, { passive: true })
    addEventListener('resize', onResize)
    addEventListener('pointermove', onPointer, { passive: true })
    raf = requestAnimationFrame(frame)
    return () => {
      alive = false; cancelAnimationFrame(raf)
      removeEventListener('scroll', read); removeEventListener('resize', onResize); removeEventListener('pointermove', onPointer)
      handle.current?.dispose(); handle.current = null
    }
  }, [cards, router])

  const card = cards[front]

  return (
    <div ref={root} className="sr" data-state={state}>
      <div ref={track} className="sr-track">
        <div className="sr-stage">
          <canvas ref={canvas} className="sr-canvas" aria-label="אולם התצוגה של בוואריאן מוטורס" role="img" />

          <header className="sr-top">
            <Link ref={logo} href="/cars" className="sr-logo" aria-label="בוואריאן מוטורס">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-full-light-sm.png" alt="" width={420} height={195} />
            </Link>
            <Link href="/cars" className="sr-exit">כל הרכבים</Link>
          </header>

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
