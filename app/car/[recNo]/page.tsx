import Link from 'next/link'
import type { Metadata } from 'next'
import { fetchCarDetail, fetchCarSummaryByRecNo } from '@/lib/scraper'
import CarGallery from './CarGallery'
import CarCTA from './CarCTA'

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
      padding: '7px 10px',
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

  return (
    <main style={{ minHeight: '100vh', background: '#000', direction: 'rtl', paddingBottom: 84 }}>

      {/* ─── Top nav ─── */}
      <div style={{ position: 'relative', zIndex: 10, padding: '12px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/cars" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-heebo)', fontSize: 13, color: 'rgba(255,255,255,0.5)',
          textDecoration: 'none', direction: 'rtl',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          כל הרכבים
        </Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO.webp" alt="Bavarian Motors" style={{ height: 22, opacity: 0.45 }} />
      </div>

      {/* ─── Hero title — overlaps gallery top via negative margin ─── */}
      <div style={{
        padding: '8px 18px 48px',
        position: 'relative', zIndex: 2,
        background: 'linear-gradient(to bottom, #000 52%, rgba(0,0,0,0) 100%)',
        direction: 'ltr', textAlign: 'left',
      }}>
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
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
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

      {/* ─── Gallery — pulls up under the title overlap ─── */}
      <div style={{ marginTop: -50, position: 'relative', zIndex: 1 }}>
        <CarGallery images={allImages} name={summary.name} priority />
      </div>

      {/* ─── Specs ─── */}
      <div style={{ padding: '12px 14px 0', position: 'relative' }}>
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
        <p style={{ position: 'relative', zIndex: 1,
          fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.22em',
          color: GOLD_DIM, textTransform: 'uppercase', margin: '0 0 10px', textAlign: 'right',
        }}>
          פרטי הרכב
        </p>

        {/* Row 1: יד / שנה / קילומטר */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          <SpecCell label="יד" value={yad} />
          <SpecCell label="שנה" value={yearValue} />
          <SpecCell label='קילומטר' value={km} />
        </div>

        {/* Row 2: נפח מנוע / כ"ס / סוג מנוע */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 6 }}>
          <SpecCell label="נפח מנוע" value={engineVol} />
          <SpecCell label='כ"ס' value={hp} />
          <SpecCell label="סוג מנוע" value={engineType} />
        </div>

        {/* Row 3: מחירון / המחיר שלנו */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 6 }}>
          <SpecCell label="מחירון" value={listPrice} />
          <SpecCell label="המחיר שלנו" value={summary.price || null} />
        </div>

        {/* Description */}
        {detail?.description && (
          <div style={{
            position: 'relative', zIndex: 1,
            marginTop: 14,
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${GOLD_BORDER}`,
            borderRadius: 10,
          }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.22em', color: GOLD_DIM, textTransform: 'uppercase', margin: '0 0 8px' }}>
              תיאור
            </p>
            <p style={{ fontFamily: 'var(--font-heebo)', fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, margin: 0 }}>
              {detail.description}
            </p>
          </div>
        )}
      </div>

      <CarCTA carName={summary.name} recNo={params.recNo} />
    </main>
  )
}
