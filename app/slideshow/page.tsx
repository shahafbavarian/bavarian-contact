'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { CarSummary } from '@/lib/scraper'

const SLIDE_DURATION = 8000   // ms per slide
const POLL_INTERVAL  = 5 * 60 * 1000  // 5 minutes

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function SlideshowPage() {
  const [cars, setCars] = useState<CarSummary[]>([])
  const [order, setOrder] = useState<number[]>([])
  const [slidePos, setSlidePos] = useState(0)   // index into order[]
  const [fading, setFading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentIdx = order[slidePos] ?? 0
  const currentCar = cars[currentIdx] ?? null

  const goNext = useCallback(() => {
    setFading(true)
    setTimeout(() => {
      setSlidePos(p => (p + 1) % Math.max(order.length, 1))
      setFading(false)
    }, 700)
  }, [order.length])

  // Auto-advance
  useEffect(() => {
    if (cars.length === 0) return
    timerRef.current = setTimeout(goNext, SLIDE_DURATION)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [slidePos, cars.length, goNext])

  // Fetch + reconcile car list
  const fetchCars = useCallback(async (isFirst = false) => {
    try {
      const res = await fetch('/api/cars')
      if (!res.ok) throw new Error(`${res.status}`)
      const { cars: newCars }: { cars: CarSummary[] } = await res.json()
      if (newCars.length === 0) return

      setCars(prev => {
        if (isFirst) {
          setOrder(shuffle(newCars.map((_, i) => i)))
          setLoading(false)
          return newCars
        }
        // Reconcile: keep current slide position if car still exists
        const newRecNos = new Set(newCars.map(c => c.recNo))
        const prevRecNos = new Set(prev.map(c => c.recNo))
        const changed = newCars.some(c => !prevRecNos.has(c.recNo)) || prev.some(c => !newRecNos.has(c.recNo))
        if (!changed) return prev
        setOrder(shuffle(newCars.map((_, i) => i)))
        setSlidePos(0)
        return newCars
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

  // Preload next 2 images
  useEffect(() => {
    if (cars.length === 0) return
    for (let i = 1; i <= 2; i++) {
      const nextIdx = order[(slidePos + i) % order.length]
      const nextCar = cars[nextIdx]
      if (nextCar?.imageUrl) {
        const img = new window.Image()
        img.src = nextCar.imageUrl
      }
    }
  }, [slidePos, cars, order])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO.webp" alt="Bavarian Motors" style={{ height: 70, opacity: 0.4 }} />
      </div>
    )
  }

  if (error || !currentCar) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO.webp" alt="Bavarian Motors" style={{ height: 70, opacity: 0.35, marginBottom: 24 }} />
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13 }}>לא ניתן לטעון רכבים</p>
        {error && <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, opacity: 0.5, marginTop: 8 }}>{error}</p>}
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative' }}>

      {/* ─── Background image ─── */}
      {currentCar.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={currentCar.recNo}
          src={currentCar.imageUrl}
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: fading ? 0 : 1,
            transition: 'opacity 0.7s ease-in-out',
          }}
        />
      )}

      {/* ─── Gradient overlays ─── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.15) 100%)',
      }} />
      {/* Left fade for QR readability */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.65) 100%)',
      }} />

      {/* ─── Logo top-left ─── */}
      <div style={{ position: 'absolute', top: 32, right: 40 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO.webp" alt="Bavarian Motors" style={{ height: 52, opacity: 0.85 }} />
      </div>

      {/* ─── Car info bottom-right ─── */}
      <div style={{
        position: 'absolute', bottom: 40, right: 40,
        direction: 'rtl', textAlign: 'right',
        maxWidth: '55%',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.7s ease-in-out',
      }}>
        <p style={{
          fontFamily: 'var(--font-inter)', fontSize: 11,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'rgba(200,169,110,0.7)', margin: '0 0 10px',
        }}>
          בוואריאן מוטורס
        </p>
        <h1 style={{
          fontFamily: 'var(--font-heebo)', fontWeight: 900,
          fontSize: 'clamp(28px, 3.5vw, 52px)',
          color: '#fff', margin: '0 0 12px', lineHeight: 1.15,
          textShadow: '0 2px 20px rgba(0,0,0,0.6)',
        }}>
          {currentCar.name}
        </h1>
        {currentCar.price && (
          <p style={{
            fontFamily: 'var(--font-heebo)', fontWeight: 700,
            fontSize: 'clamp(20px, 2.2vw, 34px)',
            color: 'rgba(200,169,110,0.9)', margin: 0,
            textShadow: '0 1px 12px rgba(0,0,0,0.5)',
          }}>
            {currentCar.price}
          </p>
        )}
      </div>

      {/* ─── QR bottom-left ─── */}
      <div style={{
        position: 'absolute', bottom: 36, left: 40,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.7s ease-in-out',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/qr/${currentCar.recNo}`}
          alt="QR Code"
          style={{
            width: 'clamp(130px, 13vw, 200px)',
            height: 'clamp(130px, 13vw, 200px)',
            borderRadius: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
          }}
        />
        <p style={{
          fontFamily: 'var(--font-inter)', fontSize: 11,
          color: 'rgba(255,255,255,0.5)', margin: 0,
          letterSpacing: '0.05em', textAlign: 'center',
        }}>
          סרוק לפרטים נוספים
        </p>
      </div>

      {/* ─── Slide counter top-left ─── */}
      <div style={{
        position: 'absolute', top: 36, left: 40,
        fontFamily: 'var(--font-inter)', fontSize: 12,
        color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em',
      }}>
        {slidePos + 1} / {order.length}
      </div>

      {/* ─── Progress bar ─── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: 'rgba(255,255,255,0.1)',
      }}>
        <div
          key={`${currentCar.recNo}-bar`}
          style={{
            height: '100%',
            background: 'rgba(200,169,110,0.7)',
            animation: `slideProgress ${SLIDE_DURATION}ms linear forwards`,
          }}
        />
      </div>
      <style>{`
        @keyframes slideProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>

    </div>
  )
}
