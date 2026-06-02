// Server component — no interactivity needed

const GOLD_DIM = 'rgba(200,169,110,0.5)'
const GOLD_BORDER = 'rgba(200,169,110,0.15)'

// Index 0 = grade 1 (best, dark green) → index 14 = grade 15 (worst, dark red)
const POLLUTION_COLORS = [
  '#1a6b1a', '#2a8b2a', '#3ea030', '#68be1a', '#90cc00',
  '#c0d400', '#e0d800', '#f0bc00', '#f08c00', '#e85800',
  '#d02800', '#b81000', '#980800', '#740404', '#520000',
]

// Index 0 = level 0 (worst, dark red) → index 8 = level 8 (best, dark blue)
const SAFETY_COLORS = [
  '#520000', '#980800', '#d02800', '#f08c00', '#e0d800',
  '#68be1a', '#2a8b2a', '#1060c8', '#003690',
]

function IndexBar({
  label,
  value,
  colors,
  displayHigh,
  displayLow,
  lowLabel,
  highLabel,
  colorOffset,
}: {
  label: string
  value: number | null
  colors: string[]
  displayHigh: number
  displayLow: number
  lowLabel: string
  highLabel: string
  colorOffset: number // 0 for safety (0-based), -1 for pollution (1-based)
}) {
  if (value === null) return null

  const count = displayHigh - displayLow + 1
  // Display position of the active value (0 = leftmost)
  const activePos = displayHigh - value
  const arrowPct = ((activePos + 0.5) / count * 100).toFixed(2)
  const activeColor = colors[value + colorOffset] ?? '#888'

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Label + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, direction: 'rtl' }}>
        <span style={{
          fontFamily: 'var(--font-inter)', fontSize: 9,
          letterSpacing: '0.18em', color: GOLD_DIM, textTransform: 'uppercase',
        }}>
          {label}
        </span>
        <span style={{
          background: activeColor,
          color: '#fff',
          fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 11,
          borderRadius: 4, padding: '1px 6px',
          boxShadow: `0 0 6px ${activeColor}99`,
          minWidth: 18, textAlign: 'center',
        }}>
          {value}
        </span>
      </div>

      {/* Arrow + bar */}
      <div style={{ position: 'relative', paddingTop: 10 }}>
        {/* Triangle arrow */}
        <div style={{
          position: 'absolute', top: 0,
          left: `${arrowPct}%`,
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: `7px solid ${activeColor}`,
          filter: `drop-shadow(0 0 3px ${activeColor})`,
        }} />

        {/* Color squares */}
        <div style={{ display: 'flex', gap: 2, direction: 'ltr' }}>
          {Array.from({ length: count }, (_, pos) => {
            const v = displayHigh - pos
            const isActive = v === value
            const color = colors[v + colorOffset] ?? '#888'
            return (
              <div
                key={pos}
                style={{
                  flex: 1,
                  height: isActive ? 18 : 13,
                  alignSelf: 'flex-end',
                  background: color,
                  borderRadius: 3,
                  opacity: isActive ? 1 : 0.4,
                  border: isActive ? '1.5px solid rgba(255,255,255,0.8)' : '1.5px solid transparent',
                  boxSizing: 'border-box',
                }}
              />
            )
          })}
        </div>

        {/* Min / max labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, direction: 'ltr' }}>
          <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>
            {highLabel}
          </span>
          <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>
            {lowLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function CarIndices({
  pollutionGrade,
  safetyLevel,
}: {
  pollutionGrade: number | null
  safetyLevel: number | null
}) {
  if (pollutionGrade === null && safetyLevel === null) return null

  return (
    <div style={{
      margin: '8px 14px 0',
      padding: '10px 12px 6px',
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${GOLD_BORDER}`,
      borderRadius: 10,
    }}>
      <IndexBar
        label="דרגת זיהום אוויר"
        value={pollutionGrade}
        colors={POLLUTION_COLORS}
        displayHigh={15}
        displayLow={1}
        highLabel="זיהום מרבי"
        lowLabel="זיהום מזערי"
        colorOffset={-1}
      />
      <IndexBar
        label="רמת אבזור בטיחותי"
        value={safetyLevel}
        colors={SAFETY_COLORS}
        displayHigh={8}
        displayLow={0}
        highLabel="בטיחות גבוהה"
        lowLabel="בטיחות נמוכה"
        colorOffset={0}
      />
    </div>
  )
}
