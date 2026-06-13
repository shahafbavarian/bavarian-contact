import { fetchCarDetail, fetchCarSummaryByRecNo } from '@/lib/scraper'
import { getSupabaseAdmin } from '@/lib/supabase'
import PrintButton from './PrintButton'

const SITE_URL = 'https://contact.bavarian-motors.co.il'
const GOLD = '#C8A96E'

const POLLUTION_COLORS = [
  '#1a6b1a','#2a8b2a','#3ea030','#68be1a','#90cc00',
  '#c0d400','#e0d800','#f0bc00','#f08c00','#e85800',
  '#d02800','#b81000','#980800','#740404','#520000',
]
const SAFETY_COLORS = [
  '#520000','#980800','#d02800','#f08c00','#e0d800',
  '#68be1a','#2a8b2a','#1060c8','#003690',
]

const ENGINE_LABELS: Record<string, string> = {
  petrol: 'בנזין', diesel: 'דיזל', bev: 'חשמלי',
  phev: 'היברידי (PHEV)', hev: 'היברידי (HEV)', mhev: 'מיקרו-היברידי',
}

function displayMileage(raw: string) {
  const n = parseInt(raw.replace(/[^\d]/g, ''), 10)
  if (isNaN(n)) return raw
  if (n === 0) return 'חדש'
  return n.toLocaleString('he-IL')
}

function splitCarName(name: string): [string, string] {
  const words = name.trim().split(' ')
  if (words.length <= 1) return [name, '']
  for (const m of ['Land Rover', 'Rolls-Royce', 'Aston Martin', 'Alfa Romeo']) {
    if (name.startsWith(m)) return [m, name.slice(m.length).trim()]
  }
  return [words[0], words.slice(1).join(' ')]
}

async function fetchOverrides(recNo: string) {
  try {
    const { data } = await getSupabaseAdmin()
      .from('car_overrides').select('pollution_grade, safety_level')
      .eq('rec_no', recNo).single()
    return data ?? null
  } catch { return null }
}

function IndexBar({ label, value, colors, displayHigh, displayLow, lowLabel, highLabel, colorOffset, noteNum }: {
  label: string; value: number; colors: string[]
  displayHigh: number; displayLow: number
  lowLabel: string; highLabel: string; colorOffset: number; noteNum?: number
}) {
  const count = displayHigh - displayLow + 1
  const activePos = displayHigh - value
  const arrowPct = ((activePos + 0.5) / count * 100).toFixed(2)
  const activeColor = colors[value + colorOffset] ?? '#888'

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#222', fontFamily: 'Heebo, Arial, sans-serif', direction: 'rtl' }}>
          {label}{noteNum ? <sup style={{ fontSize: 8, marginRight: 1 }}>{'*'.repeat(noteNum)}</sup> : null}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 900, fontFamily: 'Arial, sans-serif',
          color: activeColor, background: activeColor + '18',
          borderRadius: 6, padding: '1px 9px', border: `1px solid ${activeColor}55`,
        }}>
          {value}
        </span>
      </div>

      <div style={{ position: 'relative', paddingTop: 10 }}>
        <div style={{
          position: 'absolute', top: 0, left: `${arrowPct}%`,
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
          borderTop: `8px solid ${activeColor}`,
        }} />
        <div style={{ display: 'flex', gap: 2, direction: 'ltr' }}>
          {Array.from({ length: count }, (_, pos) => {
            const v = displayHigh - pos
            const isActive = v === value
            const color = colors[v + colorOffset] ?? '#888'
            return (
              <div key={pos} style={{
                flex: 1, height: isActive ? 22 : 16, alignSelf: 'flex-end',
                background: color, borderRadius: 3,
                opacity: isActive ? 1 : 0.32,
                border: isActive ? `2px solid #fff` : '2px solid transparent',
                boxShadow: isActive ? `0 0 0 1px ${color}` : 'none',
                boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 6, fontWeight: 700, color: '#fff', fontFamily: 'Arial', lineHeight: 1 }}>{v}</span>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, direction: 'ltr' }}>
          <span style={{ fontSize: 9, color: '#999', fontFamily: 'Heebo, Arial, sans-serif' }}>{highLabel}</span>
          <span style={{ fontSize: 9, color: '#999', fontFamily: 'Heebo, Arial, sans-serif' }}>{lowLabel}</span>
        </div>
      </div>
    </div>
  )
}

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '7px 4px', borderBottom: '1px solid #ececec', gap: 10,
    }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1a1a1a', fontFamily: 'Heebo, Arial, sans-serif', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 11.5, color: '#555', fontFamily: 'Heebo, Arial, sans-serif', textAlign: 'left', direction: 'ltr' }}>{value}</span>
    </div>
  )
}

export default async function PrintPage({ params }: { params: { recNo: string } }) {
  const { recNo } = params

  const [summary, detail, overrides] = await Promise.all([
    fetchCarSummaryByRecNo(recNo),
    fetchCarDetail(recNo),
    fetchOverrides(recNo),
  ])

  if (!summary) return <div style={{ padding: 40, fontFamily: 'Heebo, Arial' }}>רכב לא נמצא</div>

  const pollutionGrade = overrides?.pollution_grade ?? detail?.pollutionGrade ?? null
  const safetyLevel    = overrides?.safety_level   ?? detail?.safetyLevel    ?? null

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
  const mainImage  = summary.imageUrl
  const engineType = summary.engine ? (ENGINE_LABELS[summary.engine.toLowerCase()] ?? summary.engine) : null
  const km         = summary.mileage ? displayMileage(summary.mileage) : null
  const yad        = getSpec('יד') ?? summary.yad
  const yearValue  = getSpec('מועד', 'שנת', 'שנה') ?? summary.year ?? null
  const engineVol  = getSpec('נפח')
  const hp         = getSpec('הספק', 'כוח סוס')
  const color      = detail?.color ?? getSpec('צבע חיצ')
  const interiorColor = getSpec('צבע פנים', 'ריפוד')
  const bodyType   = detail?.bodyType ?? getSpec('מרכב', 'סוג רכב')
  const ownership  = getSpec('בעלות', 'ממשרדי')
  const transmission = detail?.transmission ?? getSpec('תיבת הילוכים', 'גיר')

  const showEVRange = summary.engine?.toLowerCase() === 'bev' || summary.engine?.toLowerCase() === 'phev'
  const evRange = showEVRange ? getSpec('טווח', 'טווח נסיעה') : null

  // Ordered spec list — nulls filtered out, then laid out in two columns
  const specs: { label: string; value: string }[] = ([
    ['יצרן', make],
    ['דגם', model || null],
    ['סוג רכב', bodyType],
    ['מועד עליה לכביש', yearValue],
    ["קילומטראז'", km],
    ['יד', yad],
    ['סוג מנוע', engineType],
    ['נפח מנוע', engineVol],
    ['הספק (כ"ס)', hp],
    ['גיר', transmission],
    ['צבע חיצוני', color],
    ['צבע פנים', interiorColor],
    ['בעלות מקורית', ownership],
    listPrice ? ['מחירון', listPrice] : null,
    summary.monthlyPrice ? ['תשלום חודשי', summary.monthlyPrice] : null,
    evRange ? ['טווח חשמלי (ק"מ)', evRange] : null,
  ] as ([string, string | null] | null)[])
    .filter((r): r is [string, string] => !!r && !!r[1])
    .map(([label, value]) => ({ label, value }))

  const hasIndices = pollutionGrade !== null || safetyLevel !== null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* Override the global app shell (position:fixed / overflow:hidden on
           html,body) which otherwise clips this document and prints blank. */
        html, body {
          position: static !important;
          overflow: visible !important;
          width: auto !important;
          height: auto !important;
          touch-action: auto !important;
          background: #e7e7ea !important;
          color: #111 !important;
          direction: rtl;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .doc {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #fff;
          box-shadow: 0 10px 50px rgba(0,0,0,0.22);
        }

        @media screen {
          body { padding: 96px 0 40px; }
        }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { background: #fff !important; }
          body { padding: 0 !important; }
          .doc { box-shadow: none !important; margin: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <PrintButton />

      {/* ── A4 document ── */}
      <div className="doc" style={{
        fontFamily: 'Heebo, Arial, sans-serif',
        direction: 'rtl',
        display: 'flex', flexDirection: 'column',
        padding: '13mm 13mm 0',
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      }}>

        {/* ── Header: centered logo ── */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${SITE_URL}/LOGO-black.png`} alt="Bavarian Motors Club"
            style={{ height: 64, objectFit: 'contain' }} />
        </div>
        <div style={{ height: 2, background: `linear-gradient(to left, transparent, ${GOLD}, transparent)`, marginBottom: 12 }} />

        {/* ── Title row: car name (right) · price + ad number (left) ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <div style={{ direction: 'ltr', textAlign: 'left' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#0f0f0f', letterSpacing: 0.5, lineHeight: 1 }}>{make}</div>
            {model && <div style={{ fontSize: 15, fontWeight: 300, color: '#555', marginTop: 3 }}>{model}</div>}
          </div>
          <div style={{ textAlign: 'left', flexShrink: 0 }}>
            {summary.price && (
              <div style={{ fontSize: 21, fontWeight: 900, color: '#0f0f0f', lineHeight: 1 }}>{summary.price}</div>
            )}
            <div style={{ fontSize: 10, color: '#999', fontFamily: 'Arial', letterSpacing: 1, marginTop: 4 }}>
              מודעה <span style={{ fontWeight: 700, color: '#666' }}>{recNo}</span>
            </div>
          </div>
        </div>

        {/* ── Cover image — shown in full, never cropped ── */}
        {mainImage && (
          <div style={{
            width: '100%', marginBottom: 14,
            background: '#f4f4f5', borderRadius: 8, border: '1px solid #ececec',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '78mm', overflow: 'hidden',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainImage}
              alt={summary.name}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
        )}

        {/* ── Specs — two columns ── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: 2, marginBottom: 4, textAlign: 'right' }}>מפרט הרכב</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 28 }}>
            {specs.map((s, i) => <SpecCell key={i} label={s.label} value={s.value} />)}
          </div>
        </div>

        {/* ── Description ── */}
        {detail?.description && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: 2, marginBottom: 5, textAlign: 'right' }}>תיאור</div>
            <p style={{ fontSize: 11, color: '#444', lineHeight: 1.65, direction: 'rtl', textAlign: 'right' }}>{detail.description}</p>
          </div>
        )}

        {/* ── Pollution & Safety indices ── */}
        {hasIndices && (
          <div style={{ background: '#faf8f5', borderRadius: 8, padding: '12px 14px 8px', marginBottom: 12, border: '1px solid #eee6dc' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: 2, marginBottom: 10, textAlign: 'right' }}>
              מדדי זיהום ובטיחות
            </div>
            {pollutionGrade !== null && (
              <IndexBar
                label="דרגת זיהום אוויר"
                value={pollutionGrade}
                colors={POLLUTION_COLORS}
                displayHigh={15} displayLow={1}
                highLabel="זיהום מרבי" lowLabel="זיהום מזערי"
                colorOffset={-1}
                noteNum={1}
              />
            )}
            {safetyLevel !== null && (
              <IndexBar
                label="רמת אבזור בטיחותי"
                value={safetyLevel}
                colors={SAFETY_COLORS}
                displayHigh={8} displayLow={0}
                highLabel="בטיחות גבוהה" lowLabel="בטיחות נמוכה"
                colorOffset={0}
                noteNum={2}
              />
            )}
            <p style={{ fontSize: 8, color: '#aaa', lineHeight: 1.6, direction: 'rtl', textAlign: 'right', marginTop: 4 }}>
              * נתוני זיהום האוויר מבוססים על נתוני היצרן על פי בדיקות מעבדה בהתאם לתקנות EU 2017/1151.<br />
              ** רמת האבזור הבטיחותי מחושבת לפי הוראת נוהל מספר 03/13 של משרד התחבורה.
            </p>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* ── Footer: QR (right, large & scannable) · contact (left) ── */}
        <div style={{
          marginTop: 8, borderTop: `1.5px solid ${GOLD}`,
          padding: '12px 0 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${SITE_URL}/api/qr/${recNo}`} alt="QR"
              style={{ width: 92, height: 92, borderRadius: 8, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#777', fontFamily: 'Heebo, Arial, sans-serif', lineHeight: 1.5 }}>
              סרקו לצפייה<br />בפרטים המלאים
            </span>
          </div>
          <div style={{ textAlign: 'left', direction: 'ltr', fontFamily: 'Heebo, Arial, sans-serif' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>Bavarian Motors Club</div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 3 }}>החושלים 4, הרצליה פיתוח</div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>טלפון: 09-956-1906 · פקס: 09-956-1903</div>
          </div>
        </div>
      </div>
    </>
  )
}
