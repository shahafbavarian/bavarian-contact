'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import type { CarSummary } from '@/lib/scraper'

const SLIDE_DURATION = 8000
const POLL_INTERVAL  = 5 * 60 * 1000

const POLLUTION_COLORS = [
  '#1a6b1a', '#2a8b2a', '#3ea030', '#68be1a', '#90cc00',
  '#c0d400', '#e0d800', '#f0bc00', '#f08c00', '#e85800',
  '#d02800', '#b81000', '#980800', '#740404', '#520000',
]
const SAFETY_COLORS = [
  '#520000', '#980800', '#d02800', '#f08c00', '#e0d800',
  '#68be1a', '#2a8b2a', '#1060c8', '#003690',
]

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

export default function SlideshowClient({ filter, imageFit = 'cover' }: { filter?: 'stock' | 'europe'; imageFit?: 'cover' | 'contain' }) {
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
      const url = filter ? `/api/cars?filter=${filter}` : '/api/cars'
      const res = await fetch(url)
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
  }, [filter])

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
        #sw-root {
          width: min(100vw, calc(100vh * 16 / 9));
          aspect-ratio: 16 / 9;
          position: relative; overflow: hidden;
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
                Both panels share this same background — visually unified.
              */}
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                {/* Backdrop layer 1 — heavy blur, full saturation */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentCar.imageUrl} alt=""
                  style={{
                    position: 'absolute', top: '-8%', left: '-8%',
                    width: '116%', height: '116%',
                    objectFit: 'cover', filter: 'blur(40px)',
                    opacity: fading ? 0 : 1,
                    transition: 'opacity 0.7s ease-in-out',
                  }}
                />
                {/* Backdrop layer 2 — lighter blur on top for depth and texture */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentCar.imageUrl} alt=""
                  style={{
                    position: 'absolute', top: '-6%', left: '-6%',
                    width: '112%', height: '112%',
                    objectFit: 'cover', filter: 'blur(12px)',
                    opacity: fading ? 0 : 0.35,
                    transition: 'opacity 0.7s ease-in-out',
                  }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.52)' }} />
              </div>

              {/*
                Layer 1 — Cinematic top + bottom vignettes across the full stage.
                Applied once over both panels so the effect is uniform.
              */}
              <div aria-hidden="true" style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '22%',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
                zIndex: 8, pointerEvents: 'none',
              }} />
              <div aria-hidden="true" style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%',
                background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                zIndex: 8, pointerEvents: 'none',
              }} />

              {/* Layer 2 — Split layout */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 1 }}>

                {/* ── Left: info panel ── */}
                {/*
                  Only a faint extra overlay — lets the shared blurred backdrop
                  show through, making both panels look continuous and connected.
                */}
                <div style={{
                  width: '32%', flexShrink: 0,
                  display: 'flex', flexDirection: 'column',
                  padding: '5% 4% 4% 5%',
                  overflow: 'hidden',
                  background: 'rgba(0,0,0,0.18)',
                  borderRight: '1px solid rgba(200,169,110,0.12)',
                  opacity: fading ? 0 : 1,
                  transition: 'opacity 0.7s ease-in-out',
                }}>

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

                  <div style={{ direction: 'ltr', textAlign: 'left', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <h1 style={{
                      fontFamily: 'var(--font-heebo)', fontWeight: 900,
                      fontSize: make.length > 9
                        ? 'clamp(14px,2.6vw,42px)'
                        : make.length > 6
                        ? 'clamp(16px,3.1vw,50px)'
                        : 'clamp(18px,3.6vw,58px)',
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

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 'clamp(20px,5%,64px)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/qr/${currentCar.recNo}`} alt="QR"
                      style={{
                        width: 'clamp(52px,7.5vw,108px)', height: 'clamp(52px,7.5vw,108px)',
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

                {/* ── Right: car image ── */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  {/*
                    Image is inset from all edges — creating a visible frame of
                    blurred backdrop around the car on every side.
                    objectFit:contain = full car, zero cropping.
                  */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: fading ? 0 : 1,
                    transition: 'opacity 0.7s ease-in-out',
                  }}>
                    <Image
                      key={`img-${currentCar.recNo}`}
                      src={currentCar.imageUrl}
                      alt={currentCar.name}
                      fill sizes="68vw"
                      style={{
                        objectFit: (currentCar.status && !currentCar.status.includes('מלאי'))
                          ? 'contain'
                          : imageFit,
                      }}
                      priority
                    />
                  </div>

                  {/* Top-left overlay: "בדרך לארץ" badge + pollution/safety badges */}
                  {(currentCar.status && !currentCar.status.includes('מלאי') ||
                    currentCar.pollutionGrade !== null || currentCar.safetyLevel !== null) && (
                    <div style={{
                      position: 'absolute', top: '8%', left: '5%', zIndex: 5,
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'clamp(4px,0.5vw,8px)',
                    }}>
                      {/* "בדרך לארץ" badge */}
                      {currentCar.status && !currentCar.status.includes('מלאי') && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: 'clamp(5px,0.7vw,9px) clamp(12px,1.5vw,22px)',
                          background: 'rgba(6,6,6,0.82)',
                          border: '1px solid rgba(200,169,110,0.55)',
                          borderRadius: 999,
                          backdropFilter: 'blur(12px)',
                          boxShadow: '0 2px 18px rgba(0,0,0,0.6), 0 0 28px rgba(200,169,110,0.07)',
                        }}>
                          <span style={{
                            fontFamily: 'var(--font-heebo)', fontWeight: 700,
                            fontSize: 'clamp(9px,1.15vw,16px)',
                            color: 'rgba(200,169,110,0.95)',
                            letterSpacing: '0.05em',
                            direction: 'rtl',
                            whiteSpace: 'nowrap',
                          }}>
                            בדרך לארץ
                          </span>
                        </div>
                      )}

                      {/* Pollution / safety badges — legally required disclosure */}
                      {(currentCar.pollutionGrade !== null || currentCar.safetyLevel !== null) && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 'clamp(5px,0.6vw,9px)',
                          padding: 'clamp(4px,0.5vw,7px) clamp(8px,1vw,14px)',
                          background: 'rgba(6,6,6,0.78)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 999,
                          backdropFilter: 'blur(12px)',
                          boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
                        }}>
                          {currentCar.pollutionGrade !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(3px,0.35vw,5px)' }}>
                              <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 'clamp(7px,0.65vw,10px)', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
                                זיהום אוויר
                              </span>
                              <span style={{
                                background: POLLUTION_COLORS[currentCar.pollutionGrade - 1],
                                color: '#fff', fontFamily: 'var(--font-inter)', fontWeight: 700,
                                fontSize: 'clamp(8px,0.75vw,12px)', borderRadius: 3,
                                padding: 'clamp(1px,0.15vw,2px) clamp(4px,0.5vw,7px)',
                                boxShadow: `0 0 5px ${POLLUTION_COLORS[currentCar.pollutionGrade - 1]}88`,
                              }}>
                                {currentCar.pollutionGrade}
                              </span>
                            </div>
                          )}
                          {currentCar.pollutionGrade !== null && currentCar.safetyLevel !== null && (
                            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 'clamp(7px,0.65vw,10px)' }}>·</span>
                          )}
                          {currentCar.safetyLevel !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(3px,0.35vw,5px)' }}>
                              <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 'clamp(7px,0.65vw,10px)', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
                                אבזור בטיחות
                              </span>
                              <span style={{
                                background: SAFETY_COLORS[currentCar.safetyLevel],
                                color: '#fff', fontFamily: 'var(--font-inter)', fontWeight: 700,
                                fontSize: 'clamp(8px,0.75vw,12px)', borderRadius: 3,
                                padding: 'clamp(1px,0.15vw,2px) clamp(4px,0.5vw,7px)',
                                boxShadow: `0 0 5px ${SAFETY_COLORS[currentCar.safetyLevel]}88`,
                              }}>
                                {currentCar.safetyLevel}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar — above vignettes */}
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
