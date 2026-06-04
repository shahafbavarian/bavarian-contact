import Link from 'next/link'
import type { Metadata } from 'next'
import { fetchCarDetail, fetchCarSummaryByRecNo } from '@/lib/scraper'
import { fetchGovIndices } from '@/lib/gov-data'
import CarGallery from './CarGallery'
import CarCTA from './CarCTA'
import CarIndices from './CarIndices'

export const revalidate = 300
export const dynamicParams = true

const GOLD = 'rgba(200,169,110,0.9)'
const GOLD_DIM = 'rgba(200,169,110,0.5)'
const GOLD_BORDER = 'rgba(200,169,110,0.15)'

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: { recNo: string } }): Promise<Metadata> {
  const summary = await fetchCarSummaryByRecNo(params.recNo)
  if (!summary) return { title: 'בוואריאן מוטורס' }
  return {
    title: `${summary.name} | בוואריאן מוטורס`,
    openGraph: { images: summary.imageUrl ? [summary.imageUrl] : [] },
  }
}

// ─── Spec cell ───────────────────────────────────────────────────────────────

function SpecCell({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{
      padding: 'clamp(4px,0.8vh,7px) 10px',
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${GOLD_BORDER}`,
      borderRadius: 8,
    }}>
      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 9, color: GOLD_DIM, marginBottom: 3, letterSpacing: '0.08em', direction: 'rtl' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-heebo)', fontSize: 13, color: value ? '#fff' : 'rgba(255,255,255,0.2)', fontWeight: 500, direction: 'ltr', textAlign: 'left' }}>
        {value || '—'}
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function CarPage({ params }: { params: { recNo: string } }) {
  const [summary, detail] = await Promise.all([
    fetchCarSummaryByRecNo(params.recNo),
    fetchCarDetail(params.recNo),
  ])

  // Gov.il preferred — exact by license plate if available, else by model+year+engine
  const gov = summary
    ? await fetchGovIndices(summary.name, summary.year, summary.engine, detail?.licensePlate)
    : { pollutionGrade: null, safetyLevel: null }
  const pollutionGrade = gov.pollutionGrade ?? detail?.pollutionGrade ?? null
  const safetyLevel    = gov.safetyLevel    ?? detail?.safetyLevel    ?? null

  if (!summary) {
    return (
      <main style={{
        minHeight: '100vh', background: '#000',
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
      if (k.includes('מחיר') && !k.includes('שלנו')) {
        const n = parseFloat(v.replace(/[^\d.]/g, ''))
        return (!isNaN(n) && n > 0) ? v : null
      }
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

  return (
    <main style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#000',
      direction: 'rtl',
      paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
      maxWidth: 480,
      margin: '0 auto',
    }}>

      {/* ─── Top nav + title ─── */}
      <div style={{
        flexShrink: 0,
        padding: 'clamp(8px,1.5vh,12px) 18px clamp(6px,1.2vh,10px)',
        position: 'relative', zIndex: 2,
        background: 'linear-gradient(to bottom, #000 calc(100% - 28px), transparent 100%)',
      }}>
        {/* Back link */}
        <Link href="/cars" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-heebo)', fontSize: 13, color: 'rgba(255,255,255,0.5)',
          textDecoration: 'none', direction: 'rtl', marginBottom: 6,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          כל הרכבים
        </Link>

        <div style={{ direction: 'ltr', textAlign: 'left' }}>
          <h1 style={{
            fontFamily: 'var(--font-heebo)', fontWeight: 900,
            fontSize: 'clamp(24px, 7vw, 38px)',
            color: '#fff', margin: 0, lineHeight: 1.0,
          }}>
            {make.toUpperCase()}
          </h1>
          {model && (
            <h2 style={{
              fontFamily: 'var(--font-heebo)', fontWeight: 300,
              fontSize: 'clamp(18px, 5.5vw, 30px)',
              color: 'rgba(255,255,255,0.8)', margin: '1px 0 0', lineHeight: 1.0,
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
      </div>

      {/* ─── Gallery — pulled up 28px, nav fade reveals top edge ─── */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 1, overflow: 'hidden', marginTop: -28 }}>
        <CarGallery images={allImages} name={summary.name} priority />
      </div>

      {/* ─── Specs ─── */}
      <div style={{ flexShrink: 0, padding: 'clamp(4px,0.8vh,12px) 14px 0', position: 'relative' }}>
        {/* Watermark logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/LOGO.webp"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '95%',
            maxWidth: 360,
            opacity: 0.055,
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        />
        {/* Row 1: יד / שנה / קילומטר */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          <SpecCell label="יד" value={yad} />
          <SpecCell label="שנה" value={yearValue} />
          <SpecCell label='ק"מ' value={km} />
        </div>

        {/* Row 2: נפח מנוע / כ"ס / סוג מנוע */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginTop: 4 }}>
          <SpecCell label="נפח מנוע" value={engineVol} />
          <SpecCell label='כ"ס' value={hp} />
          <SpecCell label="סוג מנוע" value={engineType} />
        </div>

        {/* Row 3: מחירון / המחיר שלנו */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, marginTop: 4 }}>
          <SpecCell label="מחירון" value={listPrice} />
          <SpecCell label="המחיר שלנו" value={summary.price || null} />
        </div>
      </div>

      {/* ─── Pollution / safety indices — centered in remaining space ─── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <CarIndices
          pollutionGrade={pollutionGrade}
          safetyLevel={safetyLevel}
        />
      </div>

      <CarCTA carName={summary.name} recNo={params.recNo} />
    </main>
  )
}
