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

/** Split "Mercedes-Benz GT 43 AMG Edition" → ["Mercedes-Benz", "GT 43 AMG Edition"] */
function splitName(name: string): [string, string] {
  const words = name.trim().split(' ')
  if (words.length <= 1) return [name, '']
  // Manufacturer is typically 1 word, except hyphenated ones (Mercedes-Benz, Land Rover, etc.)
  // Heuristic: if first word contains '-' or second word is short (<= 5 chars and has no digits), treat both as manufacturer
  const first = words[0]
  const second = words[1]
  const twoWordMakers = ['Land Rover', 'Rolls-Royce', 'Aston Martin', 'Alfa Romeo']
  for (const m of twoWordMakers) {
    if (name.startsWith(m)) return [m, name.slice(m.length).trim()]
  }
  return [first, words.slice(1).join(' ')]
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
        if (isFirst) {
          setOrder(shuffle(visible.map((_, i) => i)))
          setLoading(false)
          return visible
        }
        const newSet  = new Set(visible.map(c => c.recNo))
        const prevSet = new Set(prev.map(c => c.recNo))
        const changed = visible.some(c => !prevSet.has(c.recNo)) || prev.some(c => !newSet.has(c.recNo))
        if (!changed) return prev
        setOrder(shuffle(visible.map((_, i) => i)))
        setSlidePos(0)
        return visible
      })
      setError(null)
    } catch (e) {
      if (isFirst) setError(String(e))
    }
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
          position: fixed;
          inset: 0;
          background: #000;
          overflow: hidden;
        }

        #sw-root {
          position: relative;
          width: 100%;
          height: 100%;
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
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                {error}
              </p>
            </div>
          )}

          {/* ── Slide ── */}
          {!loading && currentCar && (
            <>
              {/* Background image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={currentCar.recNo}
                src={currentCar.imageUrl}
                alt=""
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%', objectFit: 'cover',
                  opacity: fading ? 0 : 1,
                  transition: 'opacity 0.7s ease-in-out',
                }}
              />

              {/* Bottom gradient — darkens lower portion for text legibility */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)',
              }} />

              {/* Left side fade — blends image into dark area behind car info */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, left: 0, width: '45%', pointerEvents: 'none',
                background: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, transparent 100%)',
              }} />

              {/* Right side fade — blends image edge with background */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, right: 0, width: '25%', pointerEvents: 'none',
                background: 'linear-gradient(to left, rgba(0,0,0,0.6) 0%, transparent 100%)',
              }} />

              {/* Slide counter — top left */}
              <div style={{
                position: 'absolute', top: '5%', left: '3%',
                fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 1.1vw, 14px)',
                color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em',
              }}>
                {slidePos + 1} / {order.length}
              </div>

              {/* Car info — bottom LEFT, LTR (English names) */}
              <div style={{
                position: 'absolute', bottom: '7%', left: '3.5%',
                direction: 'ltr', textAlign: 'left',
                maxWidth: '65%',
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.7s ease-in-out',
              }}>
                {/* Manufacturer — bold */}
                <h1 style={{
                  fontFamily: 'var(--font-heebo)', fontWeight: 900,
                  fontSize: 'clamp(18px, 3.2vw, 52px)',
                  color: '#fff', margin: 0, lineHeight: 1.1,
                  textShadow: '0 2px 20px rgba(0,0,0,0.7)',
                }}>
                  {make}
                </h1>

                {/* Model — same size, not bold, max 2 lines */}
                {model && (
                  <h2 style={{
                    fontFamily: 'var(--font-heebo)', fontWeight: 300,
                    fontSize: 'clamp(18px, 3.2vw, 52px)',
                    color: 'rgba(255,255,255,0.88)', margin: '0 0 10px', lineHeight: 1.15,
                    textShadow: '0 2px 20px rgba(0,0,0,0.7)',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {model}
                  </h2>
                )}

                {/* Price */}
                {currentCar.price && (
                  <p style={{
                    fontFamily: 'var(--font-heebo)', fontWeight: 700,
                    fontSize: 'clamp(13px, 1.8vw, 28px)',
                    color: 'rgba(200,169,110,0.9)', margin: '0 0 3px',
                    textShadow: '0 1px 10px rgba(0,0,0,0.6)',
                  }}>
                    {currentCar.price}
                  </p>
                )}
                {currentCar.monthlyPrice && (
                  <p style={{
                    fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 1vw, 15px)',
                    color: 'rgba(255,255,255,0.5)', margin: 0,
                  }}>
                    {currentCar.monthlyPrice}
                  </p>
                )}
              </div>

              {/* QR — bottom RIGHT */}
              <div style={{
                position: 'absolute', bottom: '6%', right: '3%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.7s ease-in-out',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/qr/${currentCar.recNo}`}
                  alt="QR"
                  style={{
                    width: 'clamp(80px, 10vw, 170px)',
                    height: 'clamp(80px, 10vw, 170px)',
                    borderRadius: 10,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.8)',
                  }}
                />
                <p style={{
                  fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 0.85vw, 11px)',
                  color: 'rgba(255,255,255,0.45)', margin: 0,
                  letterSpacing: '0.05em', textAlign: 'center',
                }}>
                  סרוק לפרטים נוספים
                </p>
              </div>

              {/* Progress bar */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                background: 'rgba(255,255,255,0.08)',
              }}>
                <div
                  key={`${currentCar.recNo}-bar`}
                  style={{
                    height: '100%',
                    background: 'rgba(200,169,110,0.7)',
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
