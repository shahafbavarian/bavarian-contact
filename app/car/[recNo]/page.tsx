import Image from 'next/image'
import type { Metadata } from 'next'
import { fetchCarDetail, fetchCarSummaryByRecNo } from '@/lib/scraper'
import CarGallery from './CarGallery'
import CarCTA from './CarCTA'

export const revalidate = 300
export const dynamicParams = true

const GOLD = 'rgba(200,169,110,0.85)'
const GOLD_DIM = 'rgba(200,169,110,0.45)'
const GOLD_BORDER = 'rgba(200,169,110,0.15)'

export async function generateMetadata({ params }: { params: { recNo: string } }): Promise<Metadata> {
  const car = await fetchCarDetail(params.recNo)
  const summary = car ?? await fetchCarSummaryByRecNo(params.recNo)
  if (!summary) return { title: 'בוואריאן מוטורס' }
  return {
    title: `${summary.name} | בוואריאן מוטורס`,
    openGraph: { images: summary.imageUrl ? [summary.imageUrl] : [] },
  }
}

// ─── Spec field display names ────────────────────────────────────────────────
// These are the fields that will appear on the car page.
// Fields with null values are automatically hidden.
const MAIN_SPECS: { key: keyof typeof FIELD_LABELS; label: string }[] = [
  { key: 'year',         label: 'שנת ייצור' },
  { key: 'mileage',      label: 'קילומטרז\'' },
  { key: 'engine',       label: 'מנוע' },
  { key: 'transmission', label: 'תיבת הילוכים' },
  { key: 'color',        label: 'צבע' },
  { key: 'bodyType',     label: 'סוג גוף' },
]

const FIELD_LABELS = {
  year: '', mileage: '', engine: '', transmission: '', color: '', bodyType: '',
}

function SpecGrid({ specs }: { specs: Record<string, string> }) {
  const entries = Object.entries(specs).filter(([, v]) => v)
  if (entries.length === 0) return null
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px',
      border: `1px solid ${GOLD_BORDER}`, borderRadius: 12, overflow: 'hidden',
    }}>
      {entries.map(([key, val]) => (
        <div key={key} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.025)' }}>
          <div style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.1em', color: GOLD_DIM, marginBottom: 4, textTransform: 'uppercase' }}>
            {key}
          </div>
          <div style={{ fontFamily: 'var(--font-heebo)', fontSize: 14, color: '#fff', fontWeight: 400 }}>
            {val}
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function CarPage({ params }: { params: { recNo: string } }) {
  const [car, summary] = await Promise.all([
    fetchCarDetail(params.recNo),
    fetchCarSummaryByRecNo(params.recNo),
  ])

  // Car is sold only when both detail page AND list both don't have it
  if (!car && !summary) {
    return (
      <main style={{
        minHeight: '100vh', background: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, textAlign: 'center', direction: 'rtl',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO.webp" alt="Bavarian Motors" style={{ height: 60, marginBottom: 32, opacity: 0.5 }} />
        <h1 style={{ fontFamily: 'var(--font-heebo)', fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
          רכב זה כבר לא במלאי
        </h1>
        <p style={{ fontFamily: 'var(--font-heebo)', fontSize: 15, color: 'rgba(255,255,255,0.45)', marginBottom: 32, lineHeight: 1.6 }}>
          הרכב שחיפשת כבר מצא בית חדש.
          <br />אנחנו מוכרים הרבה רכבי יוקרה — בואו נמצא לך את הבא!
        </p>
        <a
          href="https://www.bavarian-motors.co.il/He/Available_Cars"
          target="_blank"
          rel="noopener noreferrer"
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

  // Use summary data to fill in gaps when detail page doesn't have them
  const displayCar = car ?? {
    ...summary!,
    color: null, transmission: null, bodyType: null,
    description: null, images: summary!.imageUrl ? [summary!.imageUrl] : [],
    sourceUrl: `https://www.bavarian-motors.co.il/He/Car?recNo=${params.recNo}`,
    specs: {},
  }

  // Build main spec items (only non-null / non-empty)
  const mainSpecItems = MAIN_SPECS
    .map(s => ({ label: s.label, value: displayCar[s.key] as string | null }))
    .filter(s => s.value)

  // Additional specs from scraper (exclude already shown fields)
  const shownKeys = new Set(['שנה', 'שנת', 'ק"מ', 'קילומטר', 'מנוע', 'נפח', 'גיר', 'תיבת', 'הילוכים', 'צבע', 'סוג', 'גוף'])
  const extraSpecs = Object.fromEntries(
    Object.entries(displayCar.specs).filter(([k]) => !Array.from(shownKeys).some(s => k.includes(s)))
  )

  return (
    <main style={{ minHeight: '100vh', background: '#000', direction: 'rtl', paddingBottom: 90 }}>

      {/* ─── Sticky top header ─── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${GOLD_BORDER}`,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO.webp" alt="Bavarian Motors" style={{ height: 28, width: 'auto', opacity: 0.85 }} />
        <div style={{ width: 1, height: 18, background: GOLD_BORDER }} />
        <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 13, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayCar.name}
        </span>
      </header>

      {/* ─── Hero image ─── */}
      {displayCar.imageUrl && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#111' }}>
          <Image
            src={displayCar.imageUrl}
            alt={displayCar.name}
            fill
            sizes="100vw"
            style={{ objectFit: 'cover' }}
            priority
          />
          {/* Bottom gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
          }} />
          {/* Car name overlay */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 18px' }}>
            <h1 style={{
              fontFamily: 'var(--font-heebo)', fontWeight: 900,
              fontSize: 'clamp(18px, 5vw, 26px)',
              color: '#fff', margin: 0, lineHeight: 1.2,
              textShadow: '0 2px 12px rgba(0,0,0,0.8)',
            }}>
              {displayCar.name}
            </h1>
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px', maxWidth: 600, margin: '0 auto' }}>

        {/* ─── No hero fallback title ─── */}
        {!displayCar.imageUrl && (
          <h1 style={{
            fontFamily: 'var(--font-heebo)', fontWeight: 900, fontSize: 24,
            color: '#fff', padding: '24px 0 8px', margin: 0,
          }}>
            {displayCar.name}
          </h1>
        )}

        {/* ─── Price ─── */}
        {displayCar.price && (
          <div style={{
            margin: '16px 0',
            padding: '16px 18px',
            background: 'rgba(200,169,110,0.05)',
            border: `1px solid ${GOLD_BORDER}`,
            borderRadius: 12,
            display: 'flex', alignItems: 'baseline', gap: 8,
          }}>
            <span style={{
              fontFamily: 'var(--font-heebo)', fontWeight: 900,
              fontSize: 28, color: GOLD, lineHeight: 1,
            }}>
              {displayCar.price}
            </span>
          </div>
        )}

        {/* ─── Gallery ─── */}
        {displayCar.images.length > 0 && (
          <div style={{ margin: '16px 0' }}>
            <div style={{
              fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.2em',
              color: GOLD_DIM, textTransform: 'uppercase', marginBottom: 10,
            }}>
              גלריה
            </div>
            <CarGallery images={displayCar.images} name={displayCar.name} />
          </div>
        )}

        {/* ─── Main specs ─── */}
        {mainSpecItems.length > 0 && (
          <div style={{ margin: '20px 0' }}>
            <div style={{
              fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.2em',
              color: GOLD_DIM, textTransform: 'uppercase', marginBottom: 10,
            }}>
              פרטי הרכב
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            }}>
              {mainSpecItems.map(({ label, value }) => (
                <div key={label} style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.025)',
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
          </div>
        )}

        {/* ─── Extra specs from scraper ─── */}
        {Object.keys(extraSpecs).length > 0 && (
          <div style={{ margin: '20px 0' }}>
            <div style={{
              fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.2em',
              color: GOLD_DIM, textTransform: 'uppercase', marginBottom: 10,
            }}>
              מאפיינים נוספים
            </div>
            <SpecGrid specs={extraSpecs} />
          </div>
        )}

        {/* ─── Description ─── */}
        {displayCar.description && (
          <div style={{
            margin: '20px 0',
            padding: '16px 18px',
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${GOLD_BORDER}`,
            borderRadius: 12,
          }}>
            <div style={{
              fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.2em',
              color: GOLD_DIM, textTransform: 'uppercase', marginBottom: 10,
            }}>
              תיאור
            </div>
            <p style={{
              fontFamily: 'var(--font-heebo)', fontSize: 14,
              color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: 0,
            }}>
              {displayCar.description}
            </p>
          </div>
        )}

        {/* ─── Source link ─── */}
        <div style={{ margin: '24px 0 8px', textAlign: 'center' }}>
          <a
            href={displayCar.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-inter)', fontSize: 11,
              color: 'rgba(255,255,255,0.2)', textDecoration: 'none',
              letterSpacing: '0.05em',
            }}
          >
            צפה במודעה המקורית ←
          </a>
        </div>

      </div>

      {/* ─── Sticky CTA ─── */}
      <CarCTA carName={displayCar.name} recNo={params.recNo} />

    </main>
  )
}
