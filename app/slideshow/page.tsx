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

        /*
          The stage fills the ENTIRE viewport — no letterbox, no black bars.
          On a 16:9 monitor this is naturally 16:9.
          On a portrait phone the stage fills the whole phone screen.
        */
        #sw-stage {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: #000;
        }

        @keyframes swProgress {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>

      <div id="sw-stage">

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
              Layer 1 — Blurred ambient backdrop.
              Fills the entire stage. Oversized slightly so blur doesn't
              leave a soft halo at the edges.
              This fills whatever space the car image (contain) doesn't cover,
              so there are NO black bars on any screen size or ratio.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentCar.imageUrl}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '-6%', left: '-6%',
                width: '112%', height: '112%',
                objectFit: 'cover',
                filter: 'blur(26px)',
                opacity: fading ? 0 : 0.6,
                transition: 'opacity 0.7s ease-in-out',
              }}
            />

            {/* Layer 2 — Darken the backdrop */}
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.32)' }} />

            {/*
              Layer 3 — Main car image. objectFit:contain = NEVER cropped.
              The car is always fully visible. The blurred backdrop fills
              whatever space remains around it (side bands on 16:9 monitors,
              top/bottom bands on portrait phones).
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`img-${currentCar.recNo}`}
              src={currentCar.imageUrl}
              alt={currentCar.name}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'contain',
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.7s ease-in-out',
              }}
            />

            {/* Layer 4 — Edge vignette: softens the seam between car and backdrop */}
            <div aria-hidden="true" style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.45) 100%)',
            }} />

            {/* Layer 5 — Bottom gradient: text readability */}
            <div aria-hidden="true" style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.55) 28%, transparent 55%)',
            }} />

            {/* Layer 6 — Left gradient: info text contrast */}
            <div aria-hidden="true" style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(to right, rgba(0,0,0,0.65) 0%, transparent 52%)',
            }} />

            {/* Slide counter — top left */}
            <div style={{
              position: 'absolute', top: '4%', left: '3%',
              fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 1.2vw, 15px)',
              color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em',
            }}>
              {slidePos + 1} / {order.length}
            </div>

            {/* Car info — bottom left */}
            <div style={{
              position: 'absolute', bottom: '8%', left: '4%',
              direction: 'ltr', textAlign: 'left',
              maxWidth: '60%',
              opacity: fading ? 0 : 1,
              transition: 'opacity 0.7s ease-in-out',
            }}>
              <h1 style={{
                fontFamily: 'var(--font-heebo)', fontWeight: 900,
                fontSize: 'clamp(22px, 4vw, 66px)',
                color: '#fff', margin: 0, lineHeight: 1.0,
                textShadow: '0 2px 24px rgba(0,0,0,0.7)',
              }}>
                {make}
              </h1>
              {model && (
                <h2 style={{
                  fontFamily: 'var(--font-heebo)', fontWeight: 300,
                  fontSize: 'clamp(19px, 3.5vw, 58px)',
                  color: 'rgba(255,255,255,0.88)', margin: '2px 0 12px', lineHeight: 1.1,
                  textShadow: '0 2px 20px rgba(0,0,0,0.7)',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {model}
                </h2>
              )}
              {currentCar.price && (
                <p style={{
                  fontFamily: 'var(--font-heebo)', fontWeight: 700,
                  fontSize: 'clamp(15px, 2.2vw, 36px)',
                  color: 'rgba(200,169,110,0.95)', margin: '0 0 5px',
                  textShadow: '0 1px 12px rgba(0,0,0,0.6)',
                }}>
                  {currentCar.price}
                </p>
              )}
              {currentCar.monthlyPrice && (
                <p style={{
                  fontFamily: 'var(--font-inter)', fontSize: 'clamp(11px, 1.1vw, 18px)',
                  color: 'rgba(255,255,255,0.45)', margin: 0,
                }}>
                  {currentCar.monthlyPrice}
                </p>
              )}
            </div>

            {/* QR code — bottom right */}
            <div style={{
              position: 'absolute', bottom: '6%', right: '3.5%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              opacity: fading ? 0 : 1,
              transition: 'opacity 0.7s ease-in-out',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr/${currentCar.recNo}`}
                alt="QR"
                style={{
                  width: 'clamp(72px, 9vw, 150px)',
                  height: 'clamp(72px, 9vw, 150px)',
                  borderRadius: 10,
                  background: '#fff',
                  padding: 5,
                  boxShadow: '0 4px 28px rgba(0,0,0,0.85)',
                }}
              />
              <p style={{
                fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 0.85vw, 12px)',
                color: 'rgba(255,255,255,0.38)', margin: 0,
                letterSpacing: '0.06em', textAlign: 'center',
              }}>
                סרוק לפרטים נוספים
              </p>
            </div>

            {/* Progress bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)' }}>
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
    </>
  )
}
