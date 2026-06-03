'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

import type { CarSummary } from '@/lib/scraper'

const SLIDE_DURATION = 8000
const POLL_INTERVAL  = 5 * 60 * 1000

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function splitName(name: string): [string, string] {
  const words = name.trim().split(' ')
  if (words.length <= 1) return [name, '']
  const two = ['Land Rover', 'Rolls-Royce', 'Aston Martin', 'Alfa Romeo']
  for (const m of two) { if (name.startsWith(m)) return [m, name.slice(m.length).trim()] }
  return [words[0], words.slice(1).join(' ')]
}

export default function SlideshowPage() {
  const [cars, setCars]         = useState<CarSummary[]>([])
  const [order, setOrder]       = useState<number[]>([])
  const [slidePos, setSlidePos] = useState(0)
  const [fading, setFading]     = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentCar = cars[order[slidePos] ?? 0] ?? null

  const goNext = useCallback(() => {
    setFading(true)
    setTimeout(() => {
      setSlidePos(p => (p + 1) % Math.max(order.length, 1))
      setFading(false)
    }, 700)
  }, [order.length])

  useEffect(() => {
    if (cars.length === 0) return
    timerRef.current = setTimeout(goNext, SLIDE_DURATION)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [slidePos, cars.length, goNext])

  const fetchCars = useCallback(async (isFirst = false) => {
    try {
      const res = await fetch('/api/cars')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { cars: newCars }: { cars: CarSummary[] } = await res.json()
      const visible = newCars.filter(c => c.imageUrl)
      if (visible.length === 0) { if (isFirst) setError('אין רכבים זמינים'); return }
      setCars(prev => {
        if (isFirst) { setOrder(shuffle(visible.map((_, i) => i))); setLoading(false); return visible }
        const newSet = new Set(visible.map(c => c.recNo))
        const prevSet = new Set(prev.map(c => c.recNo))
        const changed = visible.some(c => !prevSet.has(c.recNo)) || prev.some(c => !newSet.has(c.recNo))
        if (!changed) return prev
        setOrder(shuffle(visible.map((_, i) => i))); setSlidePos(0); return visible
      })
      setError(null)
    } catch (e) { if (isFirst) setError(String(e)) }
  }, [])

  useEffect(() => {
    fetchCars(true)
    const id = setInterval(() => fetchCars(false), POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchCars])

  useEffect(() => {
    if (cars.length === 0) return
    for (let i = 1; i <= 2; i++) {
      const next = cars[order[(slidePos + i) % order.length]]
      if (next?.imageUrl) { const img = new window.Image(); img.src = next.imageUrl }
    }
  }, [slidePos, cars, order])

  const [make, model] = currentCar ? splitName(currentCar.name) : ['', '']

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; overflow: hidden; background: #000; }

        #sw-outer {
          position: fixed; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: #000;
        }

        /* 16:9 box — fills a matching TV, letterboxed on other screens */
        #sw-root {
          width: min(100vw, calc(100vh * 16 / 9));
          aspect-ratio: 16 / 9;
          position: relative;
          overflow: hidden;
          background: #0c0c0c;
        }

        @keyframes swProgress {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>

      <div id="sw-outer">
        <div id="sw-root">

          {/* ── Loading ── */}
          {loading && !error && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/LOGO.webp" alt="Bavarian Motors" style={{ height: 64, opacity: 0.6 }} />
              <div style={{ width: 180, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'rgba(200,169,110,0.6)', animation: 'swProgress 2s ease-in-out infinite' }} />
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/LOGO.webp" alt="Bavarian Motors" style={{ height: 56, opacity: 0.4 }} />
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* ── Slide ── */}
          {!loading && currentCar && (
            <>
              {/*
                Layer 0 — Full-bleed blurred backdrop across the ENTIRE stage.
                This fills the top/bottom margins of the contained car image
                on the right, so there are no black bars anywhere.
              */}
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentCar.imageUrl} alt=""
                  style={{
                    position: 'absolute', top: '-6%', left: '-6%',
                    width: '112%', height: '112%',
                    objectFit: 'cover',
                    filter: 'blur(24px)',
                    opacity: fading ? 0 : 1,
                    transition: 'opacity 0.7s ease-in-out',
                  }}
                />
                {/* Global darkening so backdrop doesn't overwhelm content */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
              </div>

              {/*
                Layer 1 — Two-column split layout.
                LEFT  38%: info panel (dark overlay on backdrop)
                RIGHT 62%: sharp car image (objectFit:contain, backdrop fills margins)
              */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 1 }}>

                {/* ── Left: info panel ── */}
                <div style={{
                  width: '44%', flexShrink: 0,
                  display: 'flex', flexDirection: 'column',
                  padding: '5% 4% 4% 5%',
                  /* Semi-transparent so the warm blurred backdrop bleeds through */
                  background: 'rgba(5,5,5,0.72)',
                  borderRight: '1px solid rgba(200,169,110,0.1)',
                  opacity: fading ? 0 : 1,
                  transition: 'opacity 0.7s ease-in-out',
                }}>

                  {/* Slide counter + logo */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6%', flexShrink: 0 }}>
                    <span style={{
                      fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px,0.85vw,13px)',
                      color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em',
                    }}>
                      {slidePos + 1} / {order.length}
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/LOGO.webp" alt="" aria-hidden="true"
                      style={{ height: 'clamp(14px,2vw,28px)', opacity: 0.32 }} />
                  </div>

                  {/*
                    Car name + price.
                    flex:1 + minHeight:0 lets this section expand to fill available
                    space without pushing the QR code off screen on long names.
                  */}
                  <div style={{ direction: 'ltr', textAlign: 'left', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <h1 style={{
                      fontFamily: 'var(--font-heebo)', fontWeight: 900,
                      fontSize: 'clamp(18px,3.6vw,58px)',
                      color: '#fff', margin: 0, lineHeight: 1.0,
                      textTransform: 'uppercase',
                    }}>
                      {make}
                    </h1>
                    {model && (
                      <h2 style={{
                        fontFamily: 'var(--font-heebo)', fontWeight: 300,
                        fontSize: 'clamp(14px,2.9vw,47px)',
                        color: 'rgba(255,255,255,0.82)', margin: '2px 0 0', lineHeight: 1.15,
                        /* Up to 3 lines so long model names fit */
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {model}
                      </h2>
                    )}
                    {currentCar.price && (
                      <p style={{
                        fontFamily: 'var(--font-heebo)', fontWeight: 700,
                        fontSize: 'clamp(13px,2.0vw,33px)',
                        color: 'rgba(200,169,110,0.95)', margin: '6% 0 0',
                      }}>
                        {currentCar.price}
                      </p>
                    )}
                    {currentCar.monthlyPrice && (
                      <p style={{
                        fontFamily: 'var(--font-inter)', fontSize: 'clamp(9px,0.85vw,14px)',
                        color: 'rgba(255,255,255,0.38)', margin: '3px 0 0',
                      }}>
                        {currentCar.monthlyPrice}
                      </p>
                    )}
                  </div>

                  {/* QR code — pinned to bottom of info panel, never near the car image */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, flexShrink: 0, marginTop: 'clamp(20px, 5%, 64px)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/qr/${currentCar.recNo}`}
                      alt="QR"
                      style={{
                        width: 'clamp(52px,7.5vw,108px)',
                        height: 'clamp(52px,7.5vw,108px)',
                        borderRadius: 8, background: '#fff', padding: 4,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
                      }}
                    />
                    <p style={{
                      fontFamily: 'var(--font-inter)', fontSize: 'clamp(7px,0.7vw,11px)',
                      color: 'rgba(255,255,255,0.3)', margin: 0, letterSpacing: '0.06em',
                    }}>
                      סרוק לפרטים נוספים
                    </p>
                  </div>
                </div>

                {/* ── Right: sharp car image ── */}
                {/*
                  height:100% / width:auto = always height-constrained.
                  Portrait images stay narrow (blurred backdrop fills sides).
                  Landscape images wider than the panel are clipped at edges.
                */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                    opacity: fading ? 0 : 1,
                    transition: 'opacity 0.7s ease-in-out',
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={`img-${currentCar.recNo}`}
                      src={currentCar.imageUrl}
                      alt={currentCar.name}
                      style={{
                        display: 'block',
                        width: 'auto', height: 'auto',
                        maxWidth: 'none', maxHeight: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)', zIndex: 10 }}>
                <div
                  key={`bar-${currentCar.recNo}`}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(to right, rgba(200,169,110,0.35), rgba(200,169,110,0.9))',
                    animation: `swProgress ${SLIDE_DURATION}ms linear forwards`,
                  }}
                />
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}
