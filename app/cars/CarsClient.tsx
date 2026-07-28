'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { CarSummary } from '@/lib/scraper'

const GOLD = 'rgba(200,169,110,0.9)'
const GOLD_DIM = 'rgba(200,169,110,0.5)'
const GOLD_BORDER = 'rgba(200,169,110,0.15)'
const POLL_INTERVAL = 5 * 60 * 1000

type StockFilter = 'all' | 'stock' | 'europe'

const STOCK_LABELS: Record<StockFilter, string> = {
  all:    'כל הרכבים',
  stock:  'במלאי',
  europe: 'בדרך למלאי',
}

function getMake(name: string): string {
  const twoWord = ['Land Rover', 'Rolls-Royce', 'Aston Martin', 'Alfa Romeo']
  for (const m of twoWord) { if (name.startsWith(m)) return m }
  return name.split(' ')[0] ?? name
}

// Returns the km chip text ("14,700" / "חדש") or null when truly unknown.
// New cars sometimes arrive from the source with an empty km field — if the
// car is otherwise flagged new (year/yad say "חדש"), show "חדש" so the km
// field stays consistent across all cards instead of vanishing.
function mileageChip(car: CarSummary): string | null {
  if (car.mileage) {
    const n = parseInt(car.mileage.replace(/[^\d]/g, ''), 10)
    if (!isNaN(n) && n > 0) return n.toLocaleString('he-IL')
    return 'חדש' // 0 km
  }
  if (/חדש/.test(car.year ?? '') || /חדש/.test(car.yad ?? '')) return 'חדש'
  return null
}

const YAD_CACHE_KEY = 'bav-yad'

function loadYadCache(): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem(YAD_CACHE_KEY) ?? '{}')
    return (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {}
  } catch { return {} }
}

function saveYadCache(cars: CarSummary[]) {
  try {
    const cache: Record<string, string> = {}
    cars.filter(c => c.yad).forEach(c => { cache[c.recNo] = c.yad as string })
    localStorage.setItem(YAD_CACHE_KEY, JSON.stringify(cache))
  } catch {}
}

// Never let a hung request keep the page in a loading state.
async function fetchJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok) return null
    return await res.json() as T
  } catch { return null }
}

export default function CarsClient({ initialCars }: { initialCars: CarSummary[] }) {
  const [cars, setCars]             = useState<CarSummary[]>(initialCars)
  // Only ever "loading" when the server handed us nothing to show.
  const [loading, setLoading]       = useState(initialCars.length === 0)
  const [search, setSearch]         = useState('')
  const [activeMake, setActiveMake] = useState('הכל')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [showStockMenu, setShowStockMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowStockMenu(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Fill in `yad` from the local cache on mount — instant, no network.
  useEffect(() => {
    const yadCache = loadYadCache()
    if (Object.keys(yadCache).length === 0) return
    setCars(prev => prev.map(c => c.yad ? c : { ...c, yad: yadCache[c.recNo] || '' }))
  }, [])

  useEffect(() => {
    let alive = true

    // Only the cheap list endpoint. The enriched one scrapes a detail page per
    // car; running that per visitor to fill an occasional "יד" chip is wildly
    // disproportionate, and the list scrape already carries that field.
    const refresh = async () => {
      const data = await fetchJson<{ cars: CarSummary[] }>('/api/cars?basic=1', 12000)
      if (!alive) return
      if (data?.cars?.length) {
        saveYadCache(data.cars)
        setCars(data.cars.filter(c => c.imageUrl))
      }
      setLoading(false)
    }

    // The server already rendered a list at most 5 minutes old, so a visitor
    // costs zero requests. Only fetch when the server handed us nothing.
    if (initialCars.length === 0) refresh()

    // Keeps a long-lived tab (showroom screen) current.
    const id = setInterval(refresh, POLL_INTERVAL)
    return () => { alive = false; clearInterval(id) }
  }, [initialCars.length])

  const makes = useMemo(() => {
    const set = new Set(cars.map(c => getMake(c.name)))
    return ['הכל', ...Array.from(set).sort()]
  }, [cars])

  const filtered = useMemo(() => cars.filter(c => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.price.includes(q)
    const matchMake   = activeMake === 'הכל' || getMake(c.name) === activeMake
    const matchStock  =
      stockFilter === 'stock'  ? c.status.includes('מלאי') :
      stockFilter === 'europe' ? !c.status.includes('מלאי') : true
    return matchSearch && matchMake && matchStock
  }), [cars, search, activeMake, stockFilter])

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

          {/* Title + dropdown */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowStockMenu(v => !v)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <h1 style={{ fontFamily: 'var(--font-heebo)', fontWeight: 900, fontSize: 20, color: '#fff', margin: 0, direction: 'rtl' }}>
                {STOCK_LABELS[stockFilter]}
              </h1>
              {!loading && (
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: GOLD_DIM, fontWeight: 400 }}>
                  {filtered.length}
                </span>
              )}
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none"
                style={{ color: GOLD_DIM, transition: 'transform 0.2s', transform: showStockMenu ? 'rotate(180deg)' : 'none' }}
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {showStockMenu && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'rgba(18,18,18,0.98)', backdropFilter: 'blur(12px)',
                border: `1px solid ${GOLD_BORDER}`, borderRadius: 10,
                overflow: 'hidden', zIndex: 100, minWidth: 150,
              }}>
                {(['all', 'stock', 'europe'] as StockFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => { setStockFilter(f); setShowStockMenu(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'right',
                      padding: '11px 16px',
                      background: f === stockFilter ? 'rgba(200,169,110,0.1)' : 'none',
                      border: 'none',
                      borderBottom: f !== 'europe' ? `1px solid ${GOLD_BORDER}` : 'none',
                      color: f === stockFilter ? GOLD : 'rgba(255,255,255,0.75)',
                      fontFamily: 'var(--font-heebo)', fontSize: 14,
                      fontWeight: f === stockFilter ? 700 : 400,
                      cursor: 'pointer', direction: 'rtl',
                    }}
                  >
                    {STOCK_LABELS[f]}
                  </button>
                ))}
              </div>
            )}
          </div>

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
            {filtered.map((car, idx) => (
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
                    <Image
                      src={car.imageUrl}
                      alt={car.name}
                      fill
                      // The grid is two equal columns at every width with no
                      // max-width, so a card is always ~half the viewport. The
                      // old fixed "250px" under-requested on anything wider
                      // than a phone and the browser upscaled it — that is what
                      // made these look soft on desktop.
                      sizes="50vw"
                      style={{ objectFit: 'cover' }}
                      priority={idx < 6}
                      quality={85}
                    />
                  </div>

                  {/* Info */}
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

                    {(() => {
                      const km = mileageChip(car)
                      return (
                        <div style={{ marginTop: 4, display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', direction: 'rtl' }}>
                          {car.year && (
                            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                              שנה: {car.year}
                            </span>
                          )}
                          {car.year && km !== null && (
                            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>·</span>
                          )}
                          {km !== null && (
                            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                              ק"מ: {km}
                            </span>
                          )}
                          {car.yad && (car.year || km !== null) && (
                            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>·</span>
                          )}
                          {car.yad && (
                            <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                              יד: {car.yad}
                            </span>
                          )}
                        </div>
                      )
                    })()}
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
