import type { CarDetail, CarSummary } from '@/lib/scraper'

// A4 print sheet for a car. Purely presentational: it renders from data the
// car page already fetched, so printing performs no network request of its own
// and cannot fail independently of the page it lives on.
//
// Hidden on screen, revealed only inside @media print. The controller mounts it
// through a portal on <body> so the print rules below don't have to fight the
// car page's fixed-position shell.

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

const FONT = 'var(--font-heebo), Heebo, Arial, sans-serif'

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
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#222', fontFamily: FONT, direction: 'rtl' }}>
          {label}{noteNum ? <sup style={{ fontSize: 6, marginRight: 1 }}>{'*'.repeat(noteNum)}</sup> : null}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 900, fontFamily: 'Arial, sans-serif',
          color: activeColor, background: activeColor + '18',
          borderRadius: 4, padding: '0px 5px', border: `1px solid ${activeColor}55`,
        }}>
          {value}
        </span>
      </div>

      <div style={{ position: 'relative', paddingTop: 5 }}>
        <div style={{
          position: 'absolute', top: 0, left: `${arrowPct}%`,
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '3px solid transparent', borderRight: '3px solid transparent',
          borderTop: `5px solid ${activeColor}`,
        }} />
        <div style={{ display: 'flex', gap: 1.5, direction: 'ltr' }}>
          {Array.from({ length: count }, (_, pos) => {
            const v = displayHigh - pos
            const isActive = v === value
            const color = colors[v + colorOffset] ?? '#888'
            return (
              <div key={pos} style={{
                flex: 1, height: isActive ? 9 : 5.5, alignSelf: 'flex-end',
                background: color, borderRadius: 2,
                opacity: isActive ? 1 : 0.32,
                border: isActive ? `1px solid #fff` : '1px solid transparent',
                boxShadow: isActive ? `0 0 0 1px ${color}` : 'none',
                boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 4.5, fontWeight: 700, color: '#fff', fontFamily: 'Arial', lineHeight: 1 }}>{v}</span>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, direction: 'ltr' }}>
          <span style={{ fontSize: 7, color: '#999', fontFamily: FONT }}>{highLabel}</span>
          <span style={{ fontSize: 7, color: '#999', fontFamily: FONT }}>{lowLabel}</span>
        </div>
      </div>
    </div>
  )
}

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '4px 4px', borderBottom: '1px solid #ececec', gap: 10,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#1a1a1a', fontFamily: FONT, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 11, color: '#555', fontFamily: FONT, textAlign: 'left', direction: 'ltr' }}>{value}</span>
    </div>
  )
}

export default function CarPrintSheet({
  recNo, summary, detail, pollutionGrade, safetyLevel, coverImage,
}: {
  recNo: string
  summary: CarSummary
  detail: CarDetail | null
  pollutionGrade: number | null
  safetyLevel: number | null
  coverImage: string
}) {
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
  const engineType = summary.engine ? (ENGINE_LABELS[summary.engine.toLowerCase()] ?? summary.engine) : null
  const km         = summary.mileage ? displayMileage(summary.mileage) : null
  const yad        = getSpec('יד') ?? summary.yad
  const yearRaw    = getSpec('מועד', 'שנת', 'שנה') ?? summary.year ?? null
  const yearValue  = yearRaw ? String(yearRaw).replace(/,/g, '') : null
  const engineVol  = getSpec('נפח')
  const hp         = getSpec('הספק', 'כוח סוס')
  const color      = detail?.color ?? getSpec('צבע חיצ')
  const interiorColor = getSpec('צבע פנים', 'ריפוד')
  const bodyType   = detail?.bodyType ?? getSpec('מרכב', 'סוג רכב')
  const ownership  = getSpec('בעלות', 'ממשרדי')
  const transmission = detail?.transmission ?? getSpec('תיבת הילוכים', 'גיר')

  const showEVRange = summary.engine?.toLowerCase() === 'bev' || summary.engine?.toLowerCase() === 'phev'
  const evRange = showEVRange ? getSpec('טווח', 'טווח נסיעה') : null

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
    <div data-print-sheet>
      <style>{`
        /* Invisible during normal browsing — this lives inside the car page. */
        @media screen { [data-print-sheet] { display: none !important; } }

        @media print {
          @page { size: A4 portrait; margin: 0; }

          /* The app shell pins html/body (position:fixed + overflow:hidden),
             which otherwise clips the sheet and prints a blank page. */
          html, body {
            position: static !important; overflow: visible !important;
            width: auto !important; height: auto !important;
            touch-action: auto !important;
            margin: 0 !important; padding: 0 !important;
            background: #fff !important; color: #111 !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }

          /* Hide the live page without unmounting it, then bring the sheet back.
             visibility (not display) keeps this immune to how the car page is
             structured — no assumptions about which element wraps what. */
          body * { visibility: hidden !important; }
          [data-print-sheet], [data-print-sheet] * { visibility: visible !important; }

          [data-print-sheet] {
            display: block !important;
            position: absolute !important; top: 0 !important; left: 0 !important;
            width: 210mm !important; margin: 0 !important;
          }
          [data-print-sheet] .doc {
            width: 210mm; min-height: 0 !important; height: auto !important;
            margin: 0 auto !important; box-shadow: none !important;
          }
        }
      `}</style>

      {/* ── A4 document ── */}
      <div className="doc" style={{
        fontFamily: FONT,
        direction: 'rtl',
        background: '#fff',
        display: 'flex', flexDirection: 'column',
        padding: '9mm 12mm 8mm',
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      }}>

        {/* ── Header masthead ── */}
        <div style={{
          margin: '-9mm -12mm 11px',
          background: 'linear-gradient(180deg, #fbf9f6 0%, #f3efe8 100%)',
          borderBottom: `2px solid ${GOLD}`,
          padding: '15px 0 13px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/LOGO-black.png" alt="Bavarian Motors Club"
            style={{ height: 66, objectFit: 'contain', display: 'block' }} />
        </div>

        {/* ── Title row ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {summary.price && (
              <div style={{ fontSize: 28, fontWeight: 900, color: '#0f0f0f', lineHeight: 1 }}>{summary.price}</div>
            )}
            <div style={{ fontSize: 10.5, color: '#999', fontFamily: 'Arial', letterSpacing: 1, marginTop: 5 }}>
              מודעה <span style={{ fontWeight: 700, color: '#666' }}>{recNo}</span>
            </div>
          </div>
          <div style={{ direction: 'ltr', textAlign: 'left' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#0f0f0f', letterSpacing: 0.5, lineHeight: 1 }}>{make}</div>
            {model && <div style={{ fontSize: 19, fontWeight: 300, color: '#555', marginTop: 4 }}>{model}</div>}
          </div>
        </div>

        {/* ── Cover image — fixed height keeps the sheet on a single page ── */}
        {coverImage && (
          <div style={{ width: '100%', height: '86mm', marginBottom: 9 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt={summary.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', borderRadius: 6 }}
            />
          </div>
        )}

        {/* ── Specs ── */}
        <div style={{ marginBottom: 9 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: 2, marginBottom: 3, textAlign: 'right' }}>מפרט הרכב</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 28 }}>
            {specs.map((s, i) => <SpecCell key={i} label={s.label} value={s.value} />)}
          </div>
        </div>

        {/* ── Description ── */}
        {detail?.description && (
          <div style={{ marginBottom: 9 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: 2, marginBottom: 3, textAlign: 'right' }}>תיאור</div>
            <p style={{
              fontSize: 10.5, color: '#444', lineHeight: 1.55, direction: 'rtl', textAlign: 'right',
              display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{detail.description}</p>
          </div>
        )}

        {/* ── Pollution & Safety indices ── */}
        {hasIndices && (
          <div style={{ background: '#faf8f5', borderRadius: 7, padding: '5px 10px 4px', marginBottom: 8, border: '1px solid #eee6dc' }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: GOLD, letterSpacing: 2, marginBottom: 3, textAlign: 'right' }}>
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
            <p style={{ fontSize: 6.5, color: '#aaa', lineHeight: 1.45, direction: 'rtl', textAlign: 'right', marginTop: 2 }}>
              * נתוני זיהום האוויר מבוססים על נתוני היצרן על פי בדיקות מעבדה בהתאם לתקנות EU 2017/1151.<br />
              ** רמת האבזור הבטיחותי מחושבת לפי הוראת נוהל מספר 03/13 של משרד התחבורה.
            </p>
          </div>
        )}

        {/* ── Footer: QR + contact ── */}
        <div style={{
          marginTop: 6, borderTop: `1.5px solid ${GOLD}`,
          padding: '8px 0 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${recNo}?src=print`} alt="QR"
              style={{ width: 108, height: 108, borderRadius: 8, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: '#777', fontFamily: FONT, lineHeight: 1.5 }}>
              סרקו לצפייה<br />בפרטים המלאים
            </span>
          </div>
          <div style={{ textAlign: 'left', direction: 'ltr', fontFamily: FONT }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>Bavarian Motors Club</div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 3 }}>החושלים 6, הרצליה פיתוח</div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>טלפון: 09-956-1906</div>
          </div>
        </div>
      </div>
    </div>
  )
}
