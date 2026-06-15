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

const ENGINE_LABELS: Record<string, string> = {
  petrol: 'בנזין', diesel: 'דיזל', bev: 'חשמלי',
  phev: 'היברידי PHEV', hev: 'היברידי HEV', mhev: 'מיקרו-היברידי',
}
function displayEngine(raw: string): string {
  if (!raw) return ''
  return ENGINE_LABELS[raw.toLowerCase()] ?? raw
}
function displayMileage(raw: string): string {
  if (!raw) return ''
  const n = parseInt(raw.replace(/[^\d]/g, ''), 10)
  if (isNaN(n)) return raw
  if (n === 0) return 'חדש'
  return n.toLocaleString('he-IL')
}

function SlideSpecCell({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{
      flex: 1,
      padding: 'clamp(6px,0.7vh,10px) clamp(8px,0.9vw,14px)',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(200,169,110,0.1)',
      borderRadius: 8,
      direction: 'rtl',
    }}>
      <div style={{
        fontFamily: 'var(--font-inter)',
        fontSize: 'clamp(7px,0.68vw,10px)',
        color: 'rgba(200,169,110,0.5)',
        marginBottom: 'clamp(2px,0.3vh,5px)',
        letterSpacing: '0.08em',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-heebo)',
        fontSize: 'clamp(13px,1.55vw,23px)',
        color: value ? '#fff' : 'rgba(255,255,255,0.2)',
        fontWeight: 600,
        direction: 'ltr',
        textAlign: 'left',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {value || '—'}
      </div>
    </div>
  )
}

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

  const applyNewCars = useCallback((newCars: CarSummary[], isFirst: boolean) => {
    const visible = newCars.filter(c => c.imageUrl)
    if (visible.length === 0) { if (isFirst) setError('אין רכבים זמינים'); return }
    setCars(prev => {
      if (isFirst) {
        setOrder(shuffle(visible.map((_, i) => i)))
        setLoading(false)
        return visible
      }
      const newRecNos  = new Set(visible.map(c => c.recNo))
      const prevRecNos = new Set(prev.map(c => c.recNo))
      const hasChanges = visible.some(c => !prevRecNos.has(c.recNo)) || prev.some(c => !newRecNos.has(c.recNo))
      if (!hasChanges) {
        return prev.map(p => visible.find(v => v.recNo === p.recNo) ?? p)
      }
      const recNoToIdx = new Map<string, number>(visible.map((c, i) => [c.recNo, i]))
      setOrder(prevOrder => {
        const preserved = prevOrder
          .map(i => recNoToIdx.get(prev[i]?.recNo ?? '') ?? -1)
          .filter(i => i >= 0)
        const preservedSet = new Set(preserved)
        const added = shuffle(
          visible.map((c, i) => !prevRecNos.has(c.recNo) ? i : -1)
                 .filter(i => i >= 0 && !preservedSet.has(i))
        )
        const merged = [...preserved, ...added]
        return merged.length > 0 ? merged : shuffle(visible.map((_, i) => i))
      })
      return visible
    })
    setError(null)
  }, [])

  const fetchCars = useCallback(async (isFirst = false) => {
    const base = filter ? `/api/cars?filter=${filter}` : '/api/cars'

    if (isFirst) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 1500))
          const res = await fetch(`${base}${base.includes('?') ? '&' : '?'}basic=1`)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const { cars: basic }: { cars: CarSummary[] } = await res.json()
          applyNewCars(basic, true)
          break
        } catch { /* will fall through to Phase 2 */ }
      }
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 1500))
        const res = await fetch(base)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { cars: enriched }: { cars: CarSummary[] } = await res.json()
        applyNewCars(enriched, isFirst && cars.length === 0)
        return
      } catch (e) {
        if (attempt === 2 && isFirst && cars.length === 0) setError(String(e))
      }
    }
  }, [filter, applyNewCars, cars.length])

  useEffect(() => {
    fetchCars(true)
    const id = setInterval(() => fetchCars(false), POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchCars])

  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => fetchCars(true), 20000)
    return () => clearTimeout(t)
  }, [error, fetchCars])

  const preloadCars = cars.length > 0 && order.length > 0
    ? [1, 2, 3].map(i => cars[order[(slidePos + i) % order.length]]).filter(Boolean)
    : []

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
              {/* Layer 0 — Full-bleed blurred backdrop */}
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
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

              {/* Layer 1 — Top vignette */}
              <div aria-hidden="true" style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '22%',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
                zIndex: 8, pointerEvents: 'none',
              }} />

              {/* Layer 2 — Main layout: flex column → top row + bottom spec strip */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 1 }}>

                {/* ── Top row: info panel | image panel ── */}
                <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>

                  {/* ── Left: info panel ── */}
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

                    <div style={{ direction: 'ltr', textAlign: 'left' }}>
                      <h1 style={{
                        fontFamily: 'var(--font-heebo)', fontWeight: 900,
                        fontSize: make.length > 9
                          ? 'clamp(10px,2.6vw,42px)'
                          : make.length > 6
                          ? 'clamp(12px,3.1vw,50px)'
                          : 'clamp(14px,3.6vw,58px)',
                        color: '#fff', margin: 0, lineHeight: 1.0,
                        textTransform: 'uppercase',
                      }}>
                        {make}
                      </h1>
                      {model && (
                        <h2 style={{
                          fontFamily: 'var(--font-heebo)', fontWeight: 300,
                          fontSize: model.length > 35
                            ? 'clamp(8px,1.7vw,27px)'
                            : model.length > 22
                            ? 'clamp(10px,2.2vw,36px)'
                            : 'clamp(12px,2.9vw,47px)',
                          color: 'rgba(255,255,255,0.82)', margin: '2px 0 0', lineHeight: 1.2,
                        }}>
                          {model}
                        </h2>
                      )}
                      {currentCar.price && (
                        <p style={{
                          fontFamily: 'var(--font-heebo)', fontWeight: 700,
                          fontSize: 'clamp(11px,2.0vw,33px)',
                          color: 'rgba(200,169,110,0.95)', margin: 'clamp(10px,1.5vh,20px) 0 0',
                        }}>
                          {currentCar.price}
                        </p>
                      )}
                      {currentCar.monthlyPrice && (
                        <p style={{
                          fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px,0.85vw,14px)',
                          color: 'rgba(255,255,255,0.38)', margin: '2px 0 0',
                        }}>
                          {currentCar.monthlyPrice}
                        </p>
                      )}
                    </div>

                  </div>

                  {/* ── Right: car image ── */}
                  <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute', inset: 0,
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

                    {/* Status pill — top-left */}
                    {(currentCar.status && !currentCar.status.includes('מלאי') ||
                      currentCar.pollutionGrade !== null || currentCar.safetyLevel !== null) && (() => {
                      const isEurope = currentCar.status && !currentCar.status.includes('מלאי')
                      const hasPoll  = currentCar.pollutionGrade !== null
                      const hasSafe  = currentCar.safetyLevel    !== null
                      const sep = <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 'clamp(7px,0.7vw,11px)' }}>·</span>
                      const chipSz = 'clamp(14px,1.5vw,20px)'
                      const chipStyle = (bg: string): React.CSSProperties => ({
                        width: chipSz, height: chipSz, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: bg, borderRadius: 3,
                        fontFamily: 'var(--font-inter)', fontWeight: 700,
                        fontSize: 'clamp(7px,0.7vw,10px)', color: '#fff',
                      })
                      return (
                        <div style={{
                          position: 'absolute', top: '8%', left: '5%', zIndex: 5,
                          display: 'inline-flex', alignItems: 'center',
                          gap: 'clamp(4px,0.5vw,8px)',
                          padding: 'clamp(3px,0.38vw,5px) clamp(8px,0.9vw,13px)',
                          background: 'rgba(6,6,6,0.82)',
                          border: `1px solid ${isEurope ? 'rgba(200,169,110,0.45)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 999, backdropFilter: 'blur(12px)',
                          boxShadow: '0 2px 12px rgba(0,0,0,0.55)',
                        }}>
                          {isEurope && (
                            <span style={{
                              fontFamily: 'var(--font-heebo)', fontWeight: 700,
                              fontSize: 'clamp(7px,0.72vw,11px)',
                              color: 'rgba(200,169,110,0.92)', whiteSpace: 'nowrap', direction: 'rtl',
                            }}>בדרך לארץ</span>
                          )}
                          {isEurope && (hasPoll || hasSafe) && sep}
                          {hasPoll && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(3px,0.32vw,5px)' }}>
                              <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 'clamp(6px,0.62vw,9px)', color: 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap' }}>
                                זיהום
                              </span>
                              <span style={chipStyle(POLLUTION_COLORS[currentCar.pollutionGrade! - 1])}>
                                {currentCar.pollutionGrade}
                              </span>
                            </div>
                          )}
                          {hasPoll && hasSafe && sep}
                          {hasSafe && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(3px,0.32vw,5px)' }}>
                              <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 'clamp(6px,0.62vw,9px)', color: 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap' }}>
                                בטיחות
                              </span>
                              <span style={chipStyle(SAFETY_COLORS[currentCar.safetyLevel!])}>
                                {currentCar.safetyLevel}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* QR code — centered in image panel */}
                    <div style={{
                      position: 'absolute',
                      bottom: '10%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 'clamp(4px,0.5vh,8px)',
                      padding: 'clamp(10px,1.2vw,18px)',
                      background: 'rgba(6,6,6,0.72)',
                      backdropFilter: 'blur(16px)',
                      borderRadius: 14,
                      border: '1px solid rgba(200,169,110,0.2)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
                      opacity: fading ? 0 : 1,
                      transition: 'opacity 0.7s ease-in-out',
                      zIndex: 5,
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/qr/${currentCar.recNo}`} alt="QR"
                        style={{
                          width: 'clamp(70px,10vw,148px)', height: 'clamp(70px,10vw,148px)',
                          borderRadius: 8, background: '#fff', padding: 4,
                          display: 'block',
                        }}
                      />
                      <p style={{
                        fontFamily: 'var(--font-inter)', fontSize: 'clamp(7px,0.7vw,11px)',
                        color: 'rgba(255,255,255,0.35)', margin: 0, letterSpacing: '0.08em',
                      }}>
                        סרוק לפרטים נוספים
                      </p>
                    </div>

                  </div>
                </div>

                {/* ── Bottom: car spec strip ── */}
                <div style={{
                  flexShrink: 0, height: '18%',
                  display: 'flex', alignItems: 'center',
                  padding: '0 clamp(16px,2.5%,40px)',
                  gap: 'clamp(6px,1%,16px)',
                  background: 'rgba(4,4,4,0.82)',
                  backdropFilter: 'blur(12px)',
                  borderTop: '1px solid rgba(200,169,110,0.1)',
                  opacity: fading ? 0 : 1,
                  transition: 'opacity 0.7s ease-in-out',
                }}>
                  <SlideSpecCell label="יד" value={currentCar.yad || null} />
                  <SlideSpecCell label="שנה" value={currentCar.year || null} />
                  <SlideSpecCell label='ק"מ' value={displayMileage(currentCar.mileage) || null} />
                  <SlideSpecCell label="מנוע" value={displayEngine(currentCar.engine) || null} />
                  <SlideSpecCell label="סוג רכב" value={currentCar.carType || null} />
                </div>

              </div>

              {/* Progress bar — above everything */}
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

          {/* Hidden preload layer — keeps next 3 slides' images decoded in memory */}
          {preloadCars.map(car => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`preload-${car.recNo}`}
              src={car.imageUrl}
              alt=""
              aria-hidden="true"
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            />
          ))}

        </div>
      </div>
    </>
  )
}
