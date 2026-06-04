'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import type { CarSummary } from '@/lib/scraper'

const GOLD = 'rgba(200,169,110,0.9)'
const GOLD_DIM = 'rgba(200,169,110,0.5)'
const GOLD_BORDER = 'rgba(200,169,110,0.15)'
const POLL_INTERVAL = 5 * 60 * 1000

function getMake(name: string): string {
  const twoWord = ['Land Rover', 'Rolls-Royce', 'Aston Martin', 'Alfa Romeo']
  for (const m of twoWord) { if (name.startsWith(m)) return m }
  return name.split(' ')[0] ?? name
}

function formatMileage(raw: string): string {
  if (!raw) return ''
  const n = parseInt(raw.replace(/[^\d]/g, ''), 10)
  if (isNaN(n) || n === 0) return 'חדש'
  return n.toLocaleString('he-IL')
}

const YAD_CACHE_KEY = 'bav-yad'

function loadYadCache(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(YAD_CACHE_KEY) ?? '{}') } catch { return {} }
}

function saveYadCache(cars: CarSummary[]) {
  try {
    const cache: Record<string, string> = {}
    cars.filter(c => c.yad).forEach(c => { cache[c.recNo] = c.yad as string })
    localStorage.setItem(YAD_CACHE_KEY, JSON.stringify(cache))
  } catch {}
}

export default function CarsPage() {
  const [cars, setCars]       = useState<CarSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [activeMake, setActiveMake] = useState('הכל')

  useEffect(() => {
    const load = async (isFirst: boolean) => {
      try {
        // Fast path: show basic list immediately, merge cached yad values
        if (isFirst) {
          const basicRes = await fetch('/api/cars?basic=1')
          if (basicRes.ok) {
            const { cars: basic }: { cars: CarSummary[] } = await basicRes.json()
            const yadCache = loadYadCache()
            const withYad = basic.map(c => ({ ...c, yad: c.yad || yadCache[c.recNo] || '' }))
            setCars(withYad.filter(c => c.imageUrl))
            setLoading(false)
          }
        }
        // Slow path: fetch enriched list (pollution/safety grades)
        const res = await fetch('/api/cars')
        if (!res.ok) return
        const { cars: data }: { cars: CarSummary[] } = await res.json()
        saveYadCache(data)
        setCars(data.filter(c => c.imageUrl))
      } finally {
        setLoading(false)
      }
    }
    load(true)
    const id = setInterval(() => load(false), POLL_INTERVAL)
    return () => clearInterval(id)
  }, [])

  const makes = useMemo(() => {
    const set = new Set(cars.map(c => getMake(c.name)))
    return ['הכל', ...Array.from(set).sort()]
  }, [cars])

  const filtered = useMemo(() => cars.filter(c => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.price.includes(q)
    const matchMake = activeMake === 'הכל' || getMake(c.name) === activeMake
    return matchSearch && matchMake
  }), [cars, search, activeMake])

  return (
    <main style={{ minHeight: '100vh', background: '#000', paddingBottom: 32 }}>
      <style>{`
        html, body {
          overflow: auto !important;
          position: static !important;
          height: auto !important;
          touch-action: auto !important;
          overscroll-behavior: auto !important;
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '16px 18px 0', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(8px)', zIndex: 20, borderBottom: `1px solid ${GOLD_BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ fontFamily: 'var(--font-heebo)', fontWeight: 900, fontSize: 20, color: '#fff', margin: 0, direction: 'rtl' }}>
            רכבים במלאי
            {!loading && <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: GOLD_DIM, fontWeight: 400, marginRight: 8 }}>
              {filtered.length}
            </span>}
          </h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/LOGO.webp" alt="Bavarian Motors" style={{ height: 26, opacity: 0.5 }} />
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="חיפוש לפי שם רכב..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${GOLD_BORDER}`,
              borderRadius: 10, padding: '9px 36px 9px 12px',
              fontFamily: 'var(--font-heebo)', fontSize: 14,
              color: '#fff', outline: 'none', direction: 'rtl',
            }}
          />
        </div>

        {/* Manufacturer filter */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
          {makes.map(m => (
            <button
              key={m}
              onClick={() => setActiveMake(m)}
              style={{
                flexShrink: 0,
                background: m === activeMake ? 'rgba(200,169,110,0.9)' : 'rgba(255,255,255,0.05)',
                color: m === activeMake ? '#000' : 'rgba(255,255,255,0.65)',
                border: `1px solid ${m === activeMake ? 'transparent' : GOLD_BORDER}`,
                borderRadius: 20, padding: '5px 14px',
                fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-heebo)', fontWeight: m === activeMake ? 700 : 400,
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: '14px 10px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <div style={{ width: 140, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: GOLD, animation: 'carListProgress 1.6s ease-in-out infinite' }} />
            </div>
            <style>{`@keyframes carListProgress { 0%{width:0;margin-left:0} 50%{width:100%;margin-left:0} 100%{width:0;margin-left:100%} }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-heebo)', paddingTop: 40 }}>
            לא נמצאו רכבים
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {filtered.map(car => (
              <Link key={car.recNo} href={`/car/${car.recNo}`} style={{ textDecoration: 'none', display: 'block', minWidth: 0, height: '100%' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${GOLD_BORDER}`,
                  borderRadius: 12, overflow: 'hidden',
                  transition: 'border-color 0.2s',
                  display: 'flex', flexDirection: 'column', height: '100%',
                }}>
                  {/* Image */}
                  <div style={{ aspectRatio: '3/2', overflow: 'hidden', background: '#111', position: 'relative', flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={car.imageUrl}
                      alt={car.name}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Info — flex:1 so all cards fill equal height */}
                  <div style={{ padding: '9px 10px 10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {(() => {
                      const make = getMake(car.name)
                      const model = car.name.slice(make.length).trim()
                      return (
                        <div style={{ marginBottom: 5, direction: 'ltr', textAlign: 'left' }}>
                          <div style={{ fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 13, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {make}
                          </div>
                          {model && (
                            <div style={{ fontFamily: 'var(--font-heebo)', fontWeight: 400, fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {model}
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    <div style={{ flex: 1 }} />

                    {car.price && (
                      <div style={{ fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 14, color: GOLD }}>
                        {car.price}
                      </div>
                    )}

                    <div style={{ marginTop: 4, display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', direction: 'rtl' }}>
                      {car.year && (
                        <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                          שנה: {car.year}
                        </span>
                      )}
                      {car.year && car.mileage && (
                        <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>·</span>
                      )}
                      {car.mileage && (
                        <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                          {formatMileage(car.mileage) === 'חדש' ? 'חדש' : `ק"מ: ${formatMileage(car.mileage)}`}
                        </span>
                      )}
                      {car.yad && (car.year || car.mileage) && (
                        <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>·</span>
                      )}
                      {car.yad && (
                        <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                          יד: {car.yad}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
