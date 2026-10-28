'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { CarSummary } from '@/lib/scraper'
import TopBar from '../team/TopBar'
import Reveal from '../team/Reveal'
import SiteFooter from '../team/SiteFooter'

const POLL_INTERVAL = 5 * 60 * 1000

type StockFilter = 'all' | 'stock' | 'europe'

const STOCK_LABELS: Record<StockFilter, string> = {
  all:    'הכל',
  stock:  'במלאי',
  europe: 'בדרך לארץ',
}

function getMake(name: string): string {
  const twoWord = ['Land Rover', 'Rolls-Royce', 'Aston Martin', 'Alfa Romeo']
  for (const m of twoWord) { if (name.startsWith(m)) return m }
  return name.split(' ')[0] ?? name
}

// Returns the km text ("14,700" / "חדש") or null when truly unknown.
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

function inStock(car: CarSummary): boolean {
  return car.status.includes('מלאי')
}

// A quiet one-line availability mark — a dot and a word, under the price,
// never covering the photo.
function Avail({ car }: { car: CarSummary }) {
  const stock = inStock(car)
  return (
    <p className={`bm-avail ${stock ? 'is-stock' : 'is-transit'}`}>
      <i aria-hidden="true" />
      {stock ? 'במלאי' : 'בדרך לארץ'}
    </p>
  )
}

function CarMeta({ car }: { car: CarSummary }) {
  const km = mileageChip(car)
  const empty = !car.year && km === null && !car.yad
  return (
    <p className="bm-car-meta">
      {car.year && <span>שנה <bdi dir="ltr">{car.year}</bdi></span>}
      {km !== null && <span>ק״מ <bdi dir="ltr">{km}</bdi></span>}
      {car.yad && <span>יד <bdi dir="ltr">{car.yad}</bdi></span>}
      {empty && ' '}
    </p>
  )
}

// One card body shared by the rail and the grid: the English make and model
// sit on the left in their own LTR block; price, specs and availability sit
// on the right in Hebrew. Every line always renders (missing values keep the
// line) and clamps to one row, so every card is exactly the same height.
function CarInfo({ car }: { car: CarSummary }) {
  const make = getMake(car.name)
  const model = car.name.slice(make.length).trim()
  return (
    <div className="bm-car-info">
      <div className="bm-car-en" dir="ltr">
        <p className="bm-car-make">{make}</p>
        <p className="bm-car-model">{model || ' '}</p>
      </div>
      <div className="bm-car-he">
        <p className="bm-car-price">{car.price ? <bdi dir="ltr">{car.price}</bdi> : ' '}</p>
        <CarMeta car={car} />
        <Avail car={car} />
      </div>
    </div>
  )
}

// Fling the page and the showroom leans with the momentum — a whisper of
// physicality, transform-only, settles instantly. Skipped on reduced motion.
function useVelocityLean(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let lastY = window.scrollY, lastT = performance.now()
    let skew = 0, target = 0, raf = 0, running = false
    const loop = () => {
      skew += (target - skew) * 0.12
      target *= 0.86 // decay toward rest
      if (Math.abs(skew) < 0.01 && Math.abs(target) < 0.01) {
        el.style.transform = ''
        running = false
        return
      }
      el.style.transform = `skewY(${skew.toFixed(3)}deg)`
      raf = requestAnimationFrame(loop)
    }
    const onScroll = () => {
      const now = performance.now()
      const dt = Math.max(8, now - lastT)
      const v = (window.scrollY - lastY) / dt // px per ms
      lastY = window.scrollY; lastT = now
      target = Math.max(-1.1, Math.min(1.1, v * 0.35))
      if (!running) { running = true; raf = requestAnimationFrame(loop) }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [ref])
}

export default function CarsClient({ initialCars }: { initialCars: CarSummary[] }) {
  const [cars, setCars]               = useState<CarSummary[]>(initialCars)
  const [loading, setLoading]         = useState(initialCars.length === 0)
  const [search, setSearch]           = useState('')
  const [activeMake, setActiveMake]   = useState('הכל')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const gridWrap = useRef<HTMLDivElement>(null)
  useVelocityLean(gridWrap)

  // Fill in `yad` from the local cache on mount — instant, no network.
  useEffect(() => {
    const yadCache = loadYadCache()
    if (Object.keys(yadCache).length === 0) return
    setCars(prev => prev.map(c => c.yad ? c : { ...c, yad: yadCache[c.recNo] || '' }))
  }, [])

  useEffect(() => {
    let alive = true
    const refresh = async () => {
      const data = await fetchJson<{ cars: CarSummary[] }>('/api/cars?basic=1', 12000)
      if (!alive) return
      if (data?.cars?.length) {
        saveYadCache(data.cars)
        setCars(data.cars.filter(c => c.imageUrl))
      }
      setLoading(false)
    }
    // The server already rendered a list at most 5 minutes old; only fetch
    // when it handed us nothing. Interval keeps a long-lived tab current.
    if (initialCars.length === 0) refresh()
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
      stockFilter === 'stock'  ? inStock(c) :
      stockFilter === 'europe' ? !inStock(c) : true
    return matchSearch && matchMake && matchStock
  }), [cars, search, activeMake, stockFilter])

  // The rail: a hand-picked feel — the freshest in-stock cars, swiped like a
  // lookbook. Hidden while searching/filtering so results stay the one list.
  const railCars = useMemo(() => cars.filter(inStock).slice(0, 6), [cars])
  const showRail = railCars.length >= 3 && !search.trim() && activeMake === 'הכל' && stockFilter === 'all'
  const gridCars = showRail ? filtered.filter(c => !railCars.some(r => r.recNo === c.recNo)) : filtered

  const clearFilters = () => { setSearch(''); setActiveMake('הכל'); setStockFilter('all') }

  return (
    <div className="bm">
      <TopBar title="הרכבים" watch="cars-title" />
      <main className="bm-main bm-cars">
        <h1 id="cars-title" className="bm-display">
          <span className="bm-word" style={{ '--i': 0 } as React.CSSProperties}><span>הרכבים</span></span>
        </h1>
        {!loading && (
          <p className="bm-lede">
            <bdi dir="ltr">{cars.length}</bdi> רכבי יוקרה וספורט, במלאי ובדרך לארץ.
          </p>
        )}

        {/* ─── The console: search, availability and makes in one piece ─── */}
        <div className="bm-console">
          <div className="bm-console-top">
            <div className="bm-search">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                placeholder="חיפוש רכב…"
                aria-label="חיפוש רכב"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="bm-tabs bm-tabs-stock" role="group" aria-label="זמינות">
              {(['all', 'stock', 'europe'] as StockFilter[]).map(f => (
                <button key={f} type="button" className="bm-tab" aria-pressed={stockFilter === f}
                  onClick={() => setStockFilter(f)}>
                  {STOCK_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
          {makes.length > 2 && (
            <div className="bm-tabs bm-tabs-makes" role="group" aria-label="יצרן">
              {makes.map(m => (
                <button key={m} type="button" className="bm-tab" aria-pressed={m === activeMake}
                  onClick={() => setActiveMake(m)}>
                  {m === 'הכל' ? m : <bdi dir="ltr">{m}</bdi>}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="bm-loading" aria-label="טוען">
            <span /><span /><span />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bm-empty-cars">
            <p>לא מצאנו רכב שמתאים לחיפוש.</p>
            <button type="button" className="bm-btn" onClick={clearFilters}>נקה סינון</button>
          </div>
        ) : (
          <>
            {/* ─── The rail: swipe through the freshest stock ─── */}
            {showRail && (
              <section className="bm-rail-sec" aria-label="נבחרת במלאי">
                <ul className="bm-rail">
                  {railCars.map((car, i) => (
                    <li key={car.recNo}>
                      <Link href={`/car/${car.recNo}`} className="bm-rail-card">
                        <div className="bm-rail-photo">
                          <Image src={car.imageUrl} alt={car.name} fill priority={i < 2}
                            sizes="(min-width: 900px) 560px, 82vw" quality={85} />
                        </div>
                        <CarInfo car={car} />
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="bm-rail-hint" aria-hidden="true">החליקו לעוד ←</p>
              </section>
            )}

            {/* ─── The full collection ─── */}
            <div ref={gridWrap} className="bm-lean">
              <Reveal className="bm-grid bm-cars-grid">
                {gridCars.map((car, i) => (
                  <li key={car.recNo} data-reveal>
                    <Link href={`/car/${car.recNo}`} className="bm-car-card">
                      <div className="bm-car-photo">
                        <Image src={car.imageUrl} alt={car.name} fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          priority={!showRail && i < 2} quality={85} />
                      </div>
                      <CarInfo car={car} />
                    </Link>
                  </li>
                ))}
              </Reveal>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
