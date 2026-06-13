import { fetchCarDetail, fetchCarSummaryByRecNo } from '@/lib/scraper'
import { getSupabaseAdmin } from '@/lib/supabase'
import PrintButton from './PrintButton'

const SITE_URL = 'https://contact.bavarian-motors.co.il'

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
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#222', fontFamily: 'Heebo, Arial, sans-serif', direction: 'rtl' }}>
          {label}{noteNum ? <sup style={{ fontSize: 8, marginRight: 1 }}>{'*'.repeat(noteNum)}</sup> : null}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 900, fontFamily: 'Arial, sans-serif',
          color: activeColor, background: activeColor + '18',
          borderRadius: 6, padding: '1px 8px', border: `1px solid ${activeColor}55`,
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
                flex: 1, height: isActive ? 22 : 17, alignSelf: 'flex-end',
                background: color, borderRadius: 3,
                opacity: isActive ? 1 : 0.35,
                border: isActive ? `2px solid #fff` : '2px solid transparent',
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

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <tr>
      <td style={{ padding: '5px 10px', fontWeight: 700, color: '#111', textAlign: 'right', whiteSpace: 'nowrap', width: '28%', borderBottom: '1px solid #eee', fontFamily: 'Heebo, Arial, sans-serif', fontSize: 12 }}>{label}</td>
      <td style={{ padding: '5px 10px', color: '#444', borderBottom: '1px solid #eee', fontFamily: 'Heebo, Arial, sans-serif', fontSize: 12 }}>{value}</td>
    </tr>
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
  const yad        = getSpec('יד')
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #fff; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { width: 210mm; }
          .no-print { display: none !important; }
        }
      `}</style>

      <PrintButton />

      {/* A4 page */}
      <div style={{
        width: '210mm', minHeight: '297mm',
        margin: '0 auto', background: '#fff',
        fontFamily: 'Heebo, Arial, sans-serif',
        direction: 'rtl',
        padding: '12mm 12mm 10mm',
        position: 'relative',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          {/* QR code — reuses the same API route as the slideshow */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${SITE_URL}/api/qr/${recNo}`}
            alt="QR"
            width={72} height={72}
            style={{ border: '1px solid #eee', borderRadius: 4, flexShrink: 0 }}
          />

          {/* Black logo center */}
          <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${SITE_URL}/LOGO-black.png`} alt="Bavarian Motors Club" style={{ height: 52, objectFit: 'contain' }} />
          </div>

          {/* מודעה number */}
          <div style={{ textAlign: 'left', flexShrink: 0, paddingTop: 4 }}>
            <span style={{ fontSize: 11, color: '#888', fontFamily: 'Arial', letterSpacing: 1 }}>מודעה</span>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#111', fontFamily: 'Arial', lineHeight: 1.1 }}>{recNo}</div>
          </div>
        </div>

        {/* ── Car title ── */}
        <div style={{ textAlign: 'center', marginBottom: 8, borderTop: '1.5px solid #111', borderBottom: '1px solid #ddd', padding: '8px 0' }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#111', letterSpacing: 1, lineHeight: 1 }}>{make}</div>
          {model && <div style={{ fontSize: 16, fontWeight: 300, color: '#444', marginTop: 3 }}>{model}</div>}
          {summary.price && (
            <div style={{ fontSize: 18, fontWeight: 700, color: '#b8860b', marginTop: 4 }}>{summary.price}</div>
          )}
        </div>

        {/* ── Main image ── */}
        {mainImage && (
          <div style={{ width: '100%', marginBottom: 12, textAlign: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainImage}
              alt={summary.name}
              style={{ width: '100%', maxHeight: '75mm', objectFit: 'cover', borderRadius: 6, display: 'block' }}
            />
          </div>
        )}

        {/* ── Specs table ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, background: '#fafafa', borderRadius: 6, overflow: 'hidden', border: '1px solid #eee' }}>
          <tbody>
            <Row label="יצרן" value={make} />
            <Row label="דגם" value={model || null} />
            <Row label="סוג רכב" value={bodyType} />
            <Row label="מועד עליה לכביש" value={yearValue} />
            <Row label="קילומטראז'" value={km} />
            <Row label="יד" value={yad} />
            <Row label="סוג מנוע" value={engineType} />
            <Row label="נפח מנוע" value={engineVol} />
            <Row label='הספק (כ"ס)' value={hp} />
            <Row label="גיר" value={transmission} />
            <Row label="צבע חיצוני" value={color} />
            <Row label="צבע פנים הרכב" value={interiorColor} />
            <Row label="בעלות מקורית" value={ownership} />
            {listPrice && <Row label="מחירון" value={listPrice} />}
            <Row label="המחיר שלנו" value={summary.price || null} />
            {summary.monthlyPrice && <Row label="תשלום חודשי" value={summary.monthlyPrice} />}
            {evRange && <Row label='טווח נסיעה חשמלי (ק"מ)' value={evRange} />}
          </tbody>
        </table>

        {/* ── Description ── */}
        {detail?.description && (
          <div style={{ marginBottom: 12, padding: '8px 10px', background: '#f7f7f7', borderRadius: 6, border: '1px solid #eee' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#888', marginBottom: 4, letterSpacing: 1 }}>תיאור</div>
            <p style={{ fontSize: 11, color: '#444', lineHeight: 1.6, direction: 'rtl' }}>{detail.description}</p>
          </div>
        )}

        {/* ── Pollution & Safety indices ── */}
        {(pollutionGrade !== null || safetyLevel !== null) && (
          <div style={{ background: '#f5f3f0', borderRadius: 8, padding: '12px 14px 6px', marginBottom: 10, border: '1px solid #e0dcd6' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555', marginBottom: 10, textAlign: 'right', letterSpacing: 0.5 }}>
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
            <p style={{ fontSize: 8, color: '#999', lineHeight: 1.6, direction: 'rtl', textAlign: 'right', marginTop: 6, marginBottom: 6 }}>
              * נתוני זיהום האוויר מבוססים על נתוני היצרן על פי בדיקות מעבדה בהתאם לתקנות EU 2017/1151.<br />
              ** רמת האבזור הבטיחותי מחושבת לפי הוראת נוהל מספר 03/13 של משרד התחבורה.
            </p>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{
          position: 'absolute', bottom: '10mm', left: '12mm', right: '12mm',
          borderTop: '1px solid #ddd', paddingTop: 6,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 9, color: '#888' }}>Bavarian-Motors.co.il</span>
          <span style={{ fontSize: 9, color: '#888' }}>החושלים 4, הרצליה פיתוח</span>
          <span style={{ fontSize: 9, color: '#888' }}>פקס: 09-956-1903</span>
          <span style={{ fontSize: 9, color: '#888' }}>טלפון: 09-956-1906</span>
        </div>
      </div>
    </>
  )
}
