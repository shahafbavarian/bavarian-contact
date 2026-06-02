import Image from 'next/image'
import type { Metadata } from 'next'
import { fetchCarDetail, fetchCarSummaryByRecNo } from '@/lib/scraper'
import CarGallery from './CarGallery'
import CarCTA from './CarCTA'

export const revalidate = 300
export const dynamicParams = true

const GOLD = 'rgba(200,169,110,0.9)'
const GOLD_DIM = 'rgba(200,169,110,0.5)'
const GOLD_BORDER = 'rgba(200,169,110,0.15)'

// ─── Display helpers ────────────────────────────────────────────────────────

const ENGINE_LABELS: Record<string, string> = {
  petrol: 'בנזין',
  diesel: 'דיזל',
  bev:    'חשמלי',
  phev:   'היברידי (PHEV)',
  hev:    'היברידי (HEV)',
  mhev:   'מיקרו-היברידי',
}

function displayEngine(raw: string): string {
  return ENGINE_LABELS[raw.toLowerCase()] ?? raw
}

function displayMileage(raw: string): string {
  if (!raw) return ''
  const n = parseInt(raw.replace(/[^\d]/g, ''), 10)
  if (isNaN(n)) return raw          // "רכב חדש" etc — pass through
  if (n === 0) return 'רכב חדש'
  return n.toLocaleString('he-IL') + ' ק"מ'
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

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function CarPage({ params }: { params: { recNo: string } }) {
  // Summary (from data-* attrs) is always authoritative for name/price/specs.
  // Detail page is optional — supplements with gallery + description only.
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
        <a
          href="https://www.bavarian-motors.co.il/He/Available_Cars"
          target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', borderRadius: 12,
            background: GOLD, color: '#000',
            fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 15,
            textDecoration: 'none',
          }}
        >
          לכל הרכבים הזמינים
        </a>
      </main>
    )
  }

  // Hero image first, then remaining gallery images (deduplicated)
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

  const specItems = [
    getSpec('יד')                      && { label: 'יד',         value: getSpec('יד')! },
    (getSpec('מועד', 'שנת', 'שנה') ?? summary.year)
                                        && { label: 'שנה',        value: getSpec('מועד', 'שנת', 'שנה') ?? summary.year },
    summary.mileage                    && { label: 'קילומטר',    value: displayMileage(summary.mileage) },
    getSpec('נפח')                     && { label: 'נפח מנוע',   value: getSpec('נפח')! },
    getSpec('הספק', 'כוח סוס')        && { label: 'כוח סוס',    value: getSpec('הספק', 'כוח סוס')! },
    summary.engine                     && { label: 'סוג מנוע',   value: displayEngine(summary.engine) },
    listPrice                          && { label: 'מחירון',     value: listPrice },
    summary.price                      && { label: 'המחיר שלנו', value: summary.price },
  ].filter(Boolean) as { label: string; value: string }[]

  const sourceUrl = `https://www.bavarian-motors.co.il/He/Car?recNo=${params.recNo}`

  return (
    <main style={{ minHeight: '100vh', background: '#000', direction: 'rtl', paddingBottom: 84 }}>

      {/* ─── Name + price — above gallery ─── */}
      <div style={{ padding: '16px 18px 12px', maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{
          fontFamily: 'var(--font-heebo)', fontWeight: 900,
          fontSize: 'clamp(18px, 5vw, 26px)',
          color: '#fff', margin: '0 0 8px', lineHeight: 1.2,
        }}>
          {summary.name}
        </h1>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          {summary.price && (
            <span style={{ fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 22, color: GOLD }}>
              {summary.price}
            </span>
          )}
          {summary.monthlyPrice && (
            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              {summary.monthlyPrice}
            </span>
          )}
        </div>
      </div>

      {/* ─── Gallery ─── */}
      <CarGallery images={allImages} name={summary.name} priority />

      {/* ─── Specs ─── */}
      <div style={{ padding: '20px 16px 0', maxWidth: 560, margin: '0 auto' }}>

        {specItems.length > 0 && (
          <>
            <p style={{
              fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.22em',
              color: GOLD_DIM, textTransform: 'uppercase', margin: '0 0 10px',
            }}>
              פרטי הרכב
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {specItems.map(({ label, value }) => (
                <div key={label} style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${GOLD_BORDER}`,
                  borderRadius: 10,
                }}>
                  <div style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: GOLD_DIM, marginBottom: 4, letterSpacing: '0.08em' }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-heebo)', fontSize: 15, color: '#fff', fontWeight: 500 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Description */}
        {detail?.description && (
          <div style={{
            marginTop: 16,
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

        {/* Source link */}
        <div style={{ marginTop: 20, marginBottom: 8, textAlign: 'center' }}>
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: '0.05em' }}>
            צפה במודעה המקורית ←
          </a>
        </div>
      </div>

      <CarCTA carName={summary.name} recNo={params.recNo} />
    </main>
  )
}
