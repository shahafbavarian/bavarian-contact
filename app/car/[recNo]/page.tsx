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

  // Hero image always comes from the list summary (data-img attr = the car's
  // designated main photo). Gallery supplements with detail page images.
  const heroImage = summary.imageUrl

  const galleryImages = (detail?.images?.length ?? 0) > 0
    ? detail!.images
    : (summary.imageUrl ? [summary.imageUrl] : [])

  // Core specs from summary (always reliable)
  const specItems = [
    summary.year     && { label: 'שנת עלייה', value: summary.year },
    summary.mileage  && { label: 'קילומטרז\'',  value: displayMileage(summary.mileage) },
    summary.engine   && { label: 'מנוע',        value: displayEngine(summary.engine) },
    summary.carType  && { label: 'סוג רכב',     value: summary.carType },
    detail?.color        && { label: 'צבע',             value: detail.color },
    detail?.transmission && { label: 'תיבת הילוכים',    value: detail.transmission },
  ].filter(Boolean) as { label: string; value: string }[]

  const sourceUrl = `https://www.bavarian-motors.co.il/He/Car?recNo=${params.recNo}`

  return (
    <main style={{ minHeight: '100vh', background: '#000', direction: 'rtl', paddingBottom: 84 }}>

      {/* ─── Hero / main image ─── */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#111' }}>
        {heroImage ? (
          <Image
            src={heroImage}
            alt={summary.name}
            fill
            sizes="100vw"
            style={{ objectFit: 'cover' }}
            priority
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src="/LOGO.webp" alt="Bavarian Motors"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', height: 60, opacity: 0.2 }} />
        )}
        {/* Bottom fade */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.05) 55%, transparent 100%)',
        }} />
        {/* Name + price overlay */}
        <div style={{ position: 'absolute', bottom: 0, right: 0, left: 0, padding: '16px 18px 18px' }}>
          <h1 style={{
            fontFamily: 'var(--font-heebo)', fontWeight: 900,
            fontSize: 'clamp(17px, 4.5vw, 24px)',
            color: '#fff', margin: '0 0 6px', lineHeight: 1.2,
            textShadow: '0 2px 12px rgba(0,0,0,0.9)',
          }}>
            {summary.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {summary.price && (
              <span style={{
                fontFamily: 'var(--font-heebo)', fontWeight: 700,
                fontSize: 'clamp(15px, 3.5vw, 20px)', color: GOLD,
                textShadow: '0 1px 8px rgba(0,0,0,0.8)',
              }}>
                {summary.price}
              </span>
            )}
            {summary.monthlyPrice && (
              <span style={{
                fontFamily: 'var(--font-inter)', fontSize: 12,
                color: 'rgba(255,255,255,0.55)',
                textShadow: '0 1px 6px rgba(0,0,0,0.8)',
              }}>
                {summary.monthlyPrice}
              </span>
            )}
          </div>
        </div>
        {/* Logo top-right */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO.webp" alt="" style={{
          position: 'absolute', top: 14, right: 14,
          height: 28, opacity: 0.7, pointerEvents: 'none',
        }} />
      </div>

      {/* ─── Gallery (remaining images) ─── */}
      {galleryImages.length > 1 && (
        <div style={{ padding: '12px 16px 0' }}>
          <CarGallery images={galleryImages} name={summary.name} />
        </div>
      )}

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

        {/* Extra specs from detail page */}
        {detail && Object.keys(detail.specs).length > 0 && (() => {
          const shownLabels = new Set(specItems.map(s => s.label))
          const extra = Object.entries(detail.specs).filter(([k]) =>
            !Array.from(shownLabels).some(l => k.includes(l)) &&
            !['שנה', 'שנת', 'ק"מ', 'קילומטר', 'מנוע', 'נפח', 'גיר', 'תיבת', 'הילוכים', 'צבע', 'סוג', 'גוף', 'price', 'מחיר', 'יד'].some(s => k.includes(s))
          )
          if (extra.length === 0) return null
          return (
            <div style={{ marginTop: 16 }}>
              <p style={{
                fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.22em',
                color: GOLD_DIM, textTransform: 'uppercase', margin: '0 0 10px',
              }}>
                מאפיינים נוספים
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, border: `1px solid ${GOLD_BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                {extra.map(([key, val]) => (
                  <div key={key} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: GOLD_DIM, marginBottom: 3 }}>{key}</div>
                    <div style={{ fontFamily: 'var(--font-heebo)', fontSize: 13, color: '#fff' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

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
