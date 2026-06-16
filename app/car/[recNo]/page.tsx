import Link from 'next/link'
import type { Metadata } from 'next'
import { fetchCarDetail, fetchCarSummaryByRecNo, fetchCarList } from '@/lib/scraper'
import { getCachedImageUrls } from '@/lib/image-sync'
import CarGallery from './CarGallery'
import CarCTA from './CarCTA'
import CarIndices from './CarIndices'
import CarSlider from './CarSlider'
import DesktopContactForm from './DesktopContactForm'
import AccessibilityWidget from '@/app/components/AccessibilityWidget'

export const revalidate = 300
export const dynamicParams = true

// Pre-build all currently listed cars at deploy time so QR scans are instant.
// New cars added after deploy are still served dynamically (dynamicParams = true).
export async function generateStaticParams() {
  try {
    const cars = await fetchCarList()
    return cars.map(c => ({ recNo: c.recNo }))
  } catch {
    return []
  }
}

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

async function fetchCarOverrides(recNo: string): Promise<{ pollutionGrade: number | null; safetyLevel: number | null } | null> {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const { data } = await getSupabaseAdmin()
      .from('car_overrides')
      .select('pollution_grade, safety_level')
      .eq('rec_no', recNo)
      .single()
    if (!data) return null
    return { pollutionGrade: data.pollution_grade ?? null, safetyLevel: data.safety_level ?? null }
  } catch { return null }
}

async function fetchVideoUrl(recNo: string): Promise<string | null> {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const { data } = await getSupabaseAdmin()
      .from('car_videos')
      .select('youtube_url')
      .eq('rec_no', recNo)
      .single()
    return data?.youtube_url ?? null
  } catch { return null }
}

export default async function CarPage({ params }: { params: { recNo: string } }) {
  let summary, detail, videoUrl, carOverride, cdnUrls: Record<string, string>
  try {
    ;[summary, detail, videoUrl, carOverride, cdnUrls] = await Promise.all([
      fetchCarSummaryByRecNo(params.recNo),
      fetchCarDetail(params.recNo),
      fetchVideoUrl(params.recNo),
      fetchCarOverrides(params.recNo),
      getCachedImageUrls(),
    ])
  } catch {
    return (
      <main style={{
        minHeight: '100vh', background: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, textAlign: 'center', direction: 'rtl',
      }}>
        {/* Auto-reload after 12 s so unattended screens self-recover */}
        <meta httpEquiv="refresh" content={`12;url=/car/${params.recNo}`} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO.webp" alt="Bavarian Motors" style={{ height: 56, marginBottom: 28, opacity: 0.5 }} />
        <h1 style={{ fontFamily: 'var(--font-heebo)', fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
          שגיאה זמנית
        </h1>
        <p style={{ fontFamily: 'var(--font-heebo)', fontSize: 15, color: 'rgba(255,255,255,0.45)', marginBottom: 32, lineHeight: 1.7 }}>
          הדף יתרענן אוטומטית בעוד כמה שניות.
        </p>
        <a href={`/car/${params.recNo}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '14px 28px', borderRadius: 12,
          background: GOLD, color: '#000',
          fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 15,
          textDecoration: 'none',
        }}>
          נסה שוב עכשיו
        </a>
      </main>
    )
  }

  const pollutionGrade = carOverride?.pollutionGrade ?? detail?.pollutionGrade ?? null
  const safetyLevel    = carOverride?.safetyLevel    ?? detail?.safetyLevel    ?? null

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

  // Prefer Supabase CDN for the hero image — it's faster than the source site
  const heroImage = cdnUrls[params.recNo] ?? summary.imageUrl
  const allImages = [
    ...(heroImage ? [heroImage] : []),
    ...(detail?.images ?? []).filter(img => img !== summary.imageUrl && img !== heroImage),
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

  // ─── Desktop left panel: gallery fills the full left column ─────────────────
  const desktopLeft = (
    <div style={{ width: '100%', height: '100%' }}>
      <CarGallery images={allImages} name={summary.name} priority />
    </div>
  )

  // ─── Desktop right panel: nav + specs + form ─────────────────────────────────
  const desktopRight = (
    <div style={{ direction: 'rtl', padding: 'clamp(28px,3.5vh,44px) clamp(24px,2.5vw,40px)', display: 'flex', flexDirection: 'column', minHeight: '100dvh', boxSizing: 'border-box' }}>
      <Link href="/cars" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
        fontFamily: 'var(--font-heebo)', fontSize: 13, color: 'rgba(255,255,255,0.45)',
        textDecoration: 'none', direction: 'rtl', marginBottom: 'clamp(14px,2vh,22px)',
      }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        כל הרכבים
      </Link>

      <div style={{ direction: 'ltr', textAlign: 'left', flexShrink: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-heebo)', fontWeight: 900, fontSize: 'clamp(26px,2.8vw,40px)', color: '#fff', margin: 0, lineHeight: 1.0 }}>
          {make.toUpperCase()}
        </h1>
        {model && (
          <h2 style={{ fontFamily: 'var(--font-heebo)', fontWeight: 300, fontSize: 'clamp(18px,2vw,28px)', color: 'rgba(255,255,255,0.75)', margin: '2px 0 0', lineHeight: 1.0 }}>
            {model}
          </h2>
        )}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          {summary.price && (
            <span style={{ fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 'clamp(18px,1.8vw,24px)', color: GOLD }}>
              {summary.price}
            </span>
          )}
          {summary.monthlyPrice && (
            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'rgba(255,255,255,0.32)' }}>
              {summary.monthlyPrice}
            </span>
          )}
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(200,169,110,0.12)', margin: 'clamp(16px,2vh,24px) 0', flexShrink: 0 }} />

      {/* Specs grid */}
      <div style={{ flexShrink: 0, position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO.webp" alt="" aria-hidden="true" style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%', maxWidth: 300, opacity: 0.045,
          pointerEvents: 'none', userSelect: 'none', zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          <SpecCell label="יד" value={yad} />
          <SpecCell label="שנה" value={yearValue} />
          <SpecCell label='ק"מ' value={km} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 6 }}>
          <SpecCell label="נפח מנוע" value={engineVol} />
          <SpecCell label='כ"ס' value={hp} />
          <SpecCell label="סוג מנוע" value={engineType} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 6 }}>
          <SpecCell label="מחירון" value={listPrice} />
          <SpecCell label="המחיר שלנו" value={summary.price || null} />
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: 'clamp(16px,2vh,24px) 0', flexShrink: 0 }} />

      {/* Inline contact form */}
      <div style={{ flex: '1 1 auto', minHeight: 0 }}>
        <DesktopContactForm carName={summary.name} recNo={params.recNo} />
      </div>
    </div>
  )

  // ─── Screen 1 content (mobile) ───────────────────────────────────────────────
  const screen1 = (
    <main
      data-car-main
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#000',
        direction: 'rtl',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <style>{`
        @keyframes hintBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes hintSpin { to { transform: rotate(360deg); } }
        [data-scroll-hint][data-ready="1"] [data-hint-ready] { animation: hintBounce 2s ease-in-out infinite; }
        /* Short viewports (e.g. mobile Chrome with browser bars): the gallery is the
           block that gives up height, so the specs block is never clipped.
           On normal screens the image stays exactly full-width 3:2 as before. */
        [data-car-gallery-col] [data-gallery-root] { flex: 1 1 auto; min-height: 0; }
        [data-car-gallery-col] [data-gallery-main] { flex: 0 1 auto !important; min-height: 0 !important; container-type: size; }
        /* When the frame got shrunk (wider than 3:2), fill the full width and
           crop a little vertically instead of leaving blurred side bars */
        @container (aspect-ratio > 38/25) {
          [data-gallery-main] img { object-fit: cover !important; }
        }
      `}</style>

      {/* Nav */}
      <div data-car-nav style={{
        flexShrink: 0,
        padding: 'clamp(8px,1.5vh,12px) 18px clamp(6px,1.2vh,10px)',
        position: 'relative', zIndex: 2,
        background: 'linear-gradient(to bottom, #000 calc(100% - 14px), transparent 100%)',
      }}>
        <Link href="/cars" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-heebo)', fontSize: 13, color: 'rgba(255,255,255,0.5)',
          textDecoration: 'none', direction: 'rtl', marginBottom: 4,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          כל הרכבים
        </Link>
        <div style={{ direction: 'ltr', textAlign: 'left' }}>
          <h1 style={{ fontFamily: 'var(--font-heebo)', fontWeight: 900, fontSize: 'clamp(22px,6.5vw,38px)', color: '#fff', margin: 0, lineHeight: 1.0 }}>
            {make.toUpperCase()}
          </h1>
          {model && (
            <h2 style={{ fontFamily: 'var(--font-heebo)', fontWeight: 300, fontSize: 'clamp(16px,5vw,30px)', color: 'rgba(255,255,255,0.8)', margin: '1px 0 0', lineHeight: 1.0 }}>
              {model}
            </h2>
          )}
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', minHeight: 28 }}>
            {summary.price && (
              <span style={{ fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 20, color: GOLD }}>
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

      {/* Gallery — 3:2 at full width, shrinks in height only when the viewport is short */}
      <div data-car-gallery-col style={{ flex: '0 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, overflow: 'hidden', marginTop: -6 }}>
        <CarGallery images={allImages} name={summary.name} priority />
      </div>

      {/* Specs — fills remaining space on tall screens, never clipped on short ones */}
      <div data-car-specs style={{ flex: '1 1 auto', minHeight: 'fit-content', padding: 'clamp(6px,1vh,14px) 14px 0', position: 'relative' }}>
        {/* Watermark */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO.webp" alt="" aria-hidden="true" style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '95%', maxWidth: 360, opacity: 0.055,
          pointerEvents: 'none', userSelect: 'none', zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          <SpecCell label="יד" value={yad} />
          <SpecCell label="שנה" value={yearValue} />
          <SpecCell label='ק"מ' value={km} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginTop: 4 }}>
          <SpecCell label="נפח מנוע" value={engineVol} />
          <SpecCell label='כ"ס' value={hp} />
          <SpecCell label="סוג מנוע" value={engineType} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, marginTop: 4 }}>
          <SpecCell label="מחירון" value={listPrice} />
          <SpecCell label="המחיר שלנו" value={summary.price || null} />
        </div>
      </div>

      {/* Scroll hint + CTA spacer merged — content is flex-centered in the visible zone above the CTA bar */}
      {videoUrl ? (
        <div
          data-scroll-hint
          data-ready="0"
          style={{
            flexShrink: 0,
            height: 'calc(clamp(52px, 7vh, 72px) + 76px + env(safe-area-inset-bottom, 0px))',
            paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
            boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <style>{`
            @keyframes hintBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
            @keyframes hintSpin { to { transform: rotate(360deg); } }
            [data-scroll-hint][data-ready="1"] [data-hint-ready] { animation: hintBounce 2s ease-in-out infinite; }
          `}</style>
          <div data-hint-loading style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 'clamp(18px,2.4vh,26px)', height: 'clamp(18px,2.4vh,26px)', border: '2px solid rgba(200,169,110,0.2)', borderTopColor: 'rgba(200,169,110,0.75)', borderRadius: '50%', animation: 'hintSpin 0.9s linear infinite' }} />
            <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 'clamp(10px,1.4vh,13px)', color: 'rgba(200,169,110,0.55)', whiteSpace: 'nowrap' }}>סרטון בטעינה</span>
          </div>
          <div data-hint-ready style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <svg width="clamp(18px,2.4vh,26px)" height="clamp(18px,2.4vh,26px)" viewBox="0 0 16 16" fill="none">
              <path d="M8 13V3M4 7l4-4 4 4" stroke="rgba(200,169,110,0.8)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 'clamp(10px,1.4vh,13px)', color: 'rgba(200,169,110,0.65)' }}>סרטון</span>
          </div>
        </div>
      ) : (
        <div style={{ flexShrink: 0, height: 'calc(76px + env(safe-area-inset-bottom, 0px))' }} aria-hidden="true" />
      )}
    </main>
  )

  // ─── Always use CarSlider — handles both desktop/mobile, with or without video ─
  return (
    <>
      {/* Preload hero image so it starts downloading before the browser parses body */}
      {heroImage && <link rel="preload" as="image" href={heroImage} fetchPriority="high" />}
      {/* Preconnect to image origin in case CDN URL isn't available */}
      <link rel="preconnect" href="https://www.bavarian-motors.co.il" />
      {videoUrl && (
        <>
          <link rel="preconnect" href="https://www.youtube-nocookie.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://www.youtube.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://s.ytimg.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://googlevideo.com" />
        </>
      )}
      <CarSlider
        youtubeUrl={videoUrl ?? null}
        carName={summary.name}
        recNo={params.recNo}
        pollutionGrade={pollutionGrade}
        safetyLevel={safetyLevel}
        desktopLeft={desktopLeft}
        desktopRight={desktopRight}
        images={allImages}
      >
        {screen1}
      </CarSlider>
    </>
  )
}
