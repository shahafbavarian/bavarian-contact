import Link from 'next/link'
import type { Metadata } from 'next'
import { fetchCarDetail, fetchCarSummaryByRecNo } from '@/lib/scraper'
import CarGallery from './CarGallery'
import CarCTA from './CarCTA'
import CarIndices from './CarIndices'

export const revalidate = 300
export const dynamicParams = true

const GOLD = 'rgba(200,169,110,0.9)'
const GOLD_DIM = 'rgba(200,169,110,0.5)'
const GOLD_BORDER = 'rgba(200,169,110,0.15)'

const ENGINE_LABELS: Record<string, string> = {
  petrol: 'בנזין', diesel: 'דיזל', bev: 'חשמלי',
  phev: 'היברידי (PHEV)', hev: 'היברידי (HEV)', mhev: 'מיקרו-היברידי',
}
function displayEngine(raw: string): string { return ENGINE_LABELS[raw.toLowerCase()] ?? raw }

function displayMileage(raw: string): string {
  if (!raw) return ''
  const n = parseInt(raw.replace(/[^\d]/g, ''), 10)
  if (isNaN(n)) return raw
  if (n === 0) return 'חדש'
  return n.toLocaleString('he-IL')
}

function splitCarName(name: string): [string, string] {
  const words = name.trim().split(' ')
  if (words.length <= 1) return [name, '']
  const twoWord = ['Land Rover', 'Rolls-Royce', 'Aston Martin', 'Alfa Romeo']
  for (const m of twoWord) {
    if (name.startsWith(m)) return [m, name.slice(m.length).trim()]
  }
  return [words[0], words.slice(1).join(' ')]
}

export async function generateMetadata({ params }: { params: { recNo: string } }): Promise<Metadata> {
  const summary = await fetchCarSummaryByRecNo(params.recNo)
  if (!summary) return { title: 'בוואריאן מוטורס' }
  return {
    title: `${summary.name} | בוואריאן מוטורס`,
    openGraph: { images: summary.imageUrl ? [summary.imageUrl] : [] },
  }
}

export default async function CarPage({ params }: { params: { recNo: string } }) {
  const [summary, detail] = await Promise.all([
    fetchCarSummaryByRecNo(params.recNo),
    fetchCarDetail(params.recNo),
  ])

  if (!summary) {
    return (
      <main style={{
        position: 'fixed', inset: 0, background: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, textAlign: 'center', direction: 'rtl',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO.webp" alt="Bavarian Motors" style={{ height: 56, marginBottom: 28, opacity: 0.5 }} />
        <h1 style={{ fontFamily: 'var(--font-heebo)', fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
          רכב זה כבר לא במלאי
        </h1>
        <p style={{ fontFamily: 'var(--font-heebo)', fontSize: 15, color: 'rgba(255,255,255,0.45)', marginBottom: 32, lineHeight: 1.7 }}>
          הרכב שחיפשת כבר מצא בית חדש.<br />בואו נמצא לך את הבא!
        </p>
        <Link href="/cars" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '14px 28px', borderRadius: 12,
          background: GOLD, color: '#000',
          fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 15,
          textDecoration: 'none',
        }}>
          לכל הרכבים הזמינים
        </Link>
      </main>
    )
  }

  const allImages = [
    ...(summary.imageUrl ? [summary.imageUrl] : []),
    ...(detail?.images ?? []).filter(img => img !== summary.imageUrl),
  ]

  const getSpec = (...keys: string[]) => {
    if (!detail?.specs) return null
    for (const [k, v] of Object.entries(detail.specs)) {
      if (keys.some(key => k.includes(key))) return v
    }
    return null
  }

  const listPrice = (() => {
    if (!detail?.specs) return null
    for (const [k, v] of Object.entries(detail.specs)) {
      if (k.includes('מחיר') && !k.includes('שלנו')) return v
    }
    return null
  })()

  const [make, model] = splitCarName(summary.name)

  const yearValue  = getSpec('מועד', 'שנת', 'שנה') ?? summary.year ?? null
  const yad        = getSpec('יד')
  const km         = summary.mileage ? displayMileage(summary.mileage) : null
  const engineVol  = getSpec('נפח')
  const hp         = getSpec('הספק', 'כוח סוס')
  const engineType = summary.engine ? displayEngine(summary.engine) : null

  const specChips = [
    { label: 'יד', value: yad },
    { label: 'שנה', value: yearValue },
    { label: 'ק"מ', value: km },
    { label: 'נפח', value: engineVol },
    { label: 'כ"ס', value: hp },
    { label: 'מנוע', value: engineType },
    { label: 'מחירון', value: listPrice },
  ].filter((s): s is { label: string; value: string } => !!s.value)

  return (
    /*
      position:fixed + inset:0 is the only reliable cross-browser way to fill
      the exact viewport regardless of html/body CSS, Safari URL-bar behaviour,
      or Next.js wrapper elements. The gallery fills this container absolutely;
      the info panel overlays from the bottom with a dark gradient.
    */
    <main style={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      background: '#000',
      direction: 'rtl',
    }}>

      {/* ── Gallery — fills entire screen ── */}
      <CarGallery images={allImages} name={summary.name} priority />

      {/* ── Top bar: back link ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '14px 16px 48px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <Link href="/cars" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-heebo)', fontSize: 13, color: 'rgba(255,255,255,0.75)',
          textDecoration: 'none', direction: 'rtl',
          pointerEvents: 'auto',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          כל הרכבים
        </Link>
      </div>

      {/* ── Bottom panel: name / price / specs / CTA ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.88) 55%, rgba(0,0,0,0.4) 82%, transparent 100%)',
        padding: '48px 16px 0',
        paddingBottom: 'env(safe-area-inset-bottom, 12px)',
      }}>

        {/* Car name + price */}
        <div style={{ direction: 'ltr', textAlign: 'left', marginBottom: 8 }}>
          <h1 style={{
            fontFamily: 'var(--font-heebo)', fontWeight: 900,
            fontSize: 'clamp(26px, 7vw, 42px)',
            color: '#fff', margin: 0, lineHeight: 1.0,
          }}>
            {make.toUpperCase()}
          </h1>
          {model && (
            <h2 style={{
              fontFamily: 'var(--font-heebo)', fontWeight: 300,
              fontSize: 'clamp(18px, 5vw, 30px)',
              color: 'rgba(255,255,255,0.82)', margin: '2px 0 0', lineHeight: 1.0,
            }}>
              {model}
            </h2>
          )}
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            {summary.price && (
              <span style={{ fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 22, color: GOLD }}>
                {summary.price}
              </span>
            )}
            {summary.monthlyPrice && (
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>
                {summary.monthlyPrice}
              </span>
            )}
          </div>
        </div>

        {/* Horizontal spec chips */}
        {specChips.length > 0 && (
          <div style={{
            display: 'flex', gap: 5, marginBottom: 4,
            overflowX: 'auto', scrollbarWidth: 'none',
          }}>
            {specChips.map(spec => (
              <div key={spec.label} style={{
                flexShrink: 0,
                padding: '3px 8px',
                background: 'rgba(255,255,255,0.07)',
                border: `1px solid ${GOLD_BORDER}`,
                borderRadius: 6,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 8, color: GOLD_DIM, letterSpacing: '0.06em' }}>
                  {spec.label}
                </span>
                <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 11, color: '#fff', fontWeight: 500, direction: 'ltr', whiteSpace: 'nowrap' }}>
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pollution / safety indices */}
        <CarIndices
          pollutionGrade={detail?.pollutionGrade ?? null}
          safetyLevel={detail?.safetyLevel ?? null}
        />

        {/* CTA buttons */}
        <CarCTA carName={summary.name} recNo={params.recNo} />

        <div style={{ height: 4 }} />
      </div>
    </main>
  )
}
