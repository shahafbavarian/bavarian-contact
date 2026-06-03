'use client'

import { useState, useRef } from 'react'

const GOLD_DIM = 'rgba(200,169,110,0.5)'

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
  label, value, colors, displayHigh, displayLow,
  lowLabel, highLabel, colorOffset,
}: {
  label: string; value: number | null; colors: string[]
  displayHigh: number; displayLow: number
  lowLabel: string; highLabel: string; colorOffset: number
}) {
  if (value === null) return null
  const count = displayHigh - displayLow + 1
  const activePos = displayHigh - value
  const arrowPct = ((activePos + 0.5) / count * 100).toFixed(2)
  const activeColor = colors[value + colorOffset] ?? '#888'

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 8, direction: 'rtl' }}>
        <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 13, fontWeight: 500, color: 'rgba(30,30,30,0.9)' }}>
          {label}
        </span>
      </div>

      <div style={{ position: 'relative', paddingTop: 12 }}>
        <div style={{
          position: 'absolute', top: 0, left: `${arrowPct}%`,
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
          borderTop: `8px solid ${activeColor}`,
          filter: `drop-shadow(0 0 3px ${activeColor})`,
        }} />

        <div style={{ display: 'flex', gap: 3, direction: 'ltr' }}>
          {Array.from({ length: count }, (_, pos) => {
            const v = displayHigh - pos
            const isActive = v === value
            const color = colors[v + colorOffset] ?? '#888'
            return (
              <div key={pos} style={{
                flex: 1, height: isActive ? 26 : 20,
                alignSelf: 'flex-end', background: color, borderRadius: 4,
                opacity: isActive ? 1 : 0.42,
                border: isActive ? '2px solid rgba(255,255,255,0.85)' : '2px solid transparent',
                boxSizing: 'border-box',
                boxShadow: isActive ? `0 0 6px ${color}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontFamily: 'var(--font-inter)', fontSize: 7, fontWeight: 700,
                  color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                  lineHeight: 1, userSelect: 'none',
                }}>
                  {v}
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, direction: 'ltr' }}>
          <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 10, color: 'rgba(30,30,30,0.45)' }}>{highLabel}</span>
          <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 10, color: 'rgba(30,30,30,0.45)' }}>{lowLabel}</span>
        </div>
      </div>
    </div>
  )
}

export default function CarIndices({
  pollutionGrade, safetyLevel,
}: {
  pollutionGrade: number | null
  safetyLevel: number | null
}) {
  const [open, setOpen] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isClosing, setIsClosing] = useState(false)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const latestDragY = useRef(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  if (pollutionGrade === null && safetyLevel === null) return null

  const pollColor = pollutionGrade !== null ? POLLUTION_COLORS[pollutionGrade - 1] : '#888'
  const safeColor = safetyLevel !== null ? SAFETY_COLORS[safetyLevel] : '#888'

  function triggerClose() {
    // Synchronous DOM mutation — happens before the next paint frame so iOS
    // immediately sees a transparent element at bottom:0 and re-adopts the
    // html background (#000) for the safe-area / URL-bar region.
    if (sheetRef.current) {
      sheetRef.current.style.background = 'transparent'
      sheetRef.current.style.boxShadow = 'none'
      sheetRef.current.style.borderTop = 'none'
    }
    setIsClosing(true)
    setTimeout(() => { setOpen(false); setIsClosing(false); setDragY(0); latestDragY.current = 0 }, 420)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    latestDragY.current = 0
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy > 0) { latestDragY.current = dy; setDragY(dy) }
  }

  function handleTouchEnd() {
    const elapsed = Math.max(1, Date.now() - touchStartTime.current)
    const velocity = latestDragY.current / elapsed // px/ms
    if (latestDragY.current > 90 || velocity > 0.4) {
      triggerClose()
    } else {
      setDragY(0)
      latestDragY.current = 0
    }
  }

  const isDragging = dragY > 0 && !isClosing
  const backdropAlpha = isClosing ? 0 : Math.max(0, 0.72 * (1 - dragY / 300))

  return (
    <>
      <style>{`
        @keyframes ciSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes ciFadeIn  { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* ── Trigger: grade badges always visible (legal compliance) ── */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 5, width: '100%', padding: '2px 14px 8px',
          background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, direction: 'rtl' }}>
          {pollutionGrade !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 11, color: GOLD_DIM }}>
                זיהום אוויר
              </span>
              <span style={{
                background: pollColor, color: '#fff',
                fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 12,
                borderRadius: 4, padding: '2px 7px',
                boxShadow: `0 0 6px ${pollColor}99`,
              }}>
                {pollutionGrade}
              </span>
            </div>
          )}
          {safetyLevel !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 11, color: GOLD_DIM }}>
                אבזור בטיחות
              </span>
              <span style={{
                background: safeColor, color: '#fff',
                fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 12,
                borderRadius: 4, padding: '2px 7px',
                boxShadow: `0 0 6px ${safeColor}99`,
              }}>
                {safetyLevel}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 10, color: 'rgba(200,169,110,0.3)' }}>
            לפרטים נוספים
          </span>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: 'rgba(200,169,110,0.3)' }}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* ── Bottom sheet ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={triggerClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 60,
              background: `rgba(0,0,0,${backdropAlpha})`,
              transition: isDragging ? 'none' : 'background 0.3s ease',
              animation: isDragging ? 'none' : 'ciFadeIn 0.22s ease-out',
            }}
          />

          {/* Sheet */}
          <div
            ref={sheetRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 61,
              background: '#f5f3f0',
              borderRadius: '18px 18px 0 0',
              borderTop: '1px solid rgba(0,0,0,0.08)',
              padding: '0 16px',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
              opacity: isClosing ? 0 : 1,
              transform: isClosing ? 'translateY(100vh)' : `translateY(${dragY}px)`,
              transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease',
              animation: (dragY === 0 && !isClosing) ? 'ciSlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            {/* Drag handle */}
            <div style={{
              width: 40, height: 4, background: 'rgba(0,0,0,0.12)',
              borderRadius: 2, margin: '12px auto 0',
            }} />

            {/* Header */}
            <div style={{ padding: '12px 0 10px', direction: 'rtl', textAlign: 'right' }}>
              <span style={{
                fontFamily: 'var(--font-inter)', fontSize: 10,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                color: 'rgba(200,169,110,0.9)',
              }}>
                מדדי זיהום ובטיחות
              </span>
            </div>

            <IndexBar
              label="דרגת זיהום אוויר"
              value={pollutionGrade}
              colors={POLLUTION_COLORS}
              displayHigh={15} displayLow={1}
              highLabel="זיהום מרבי" lowLabel="זיהום מזערי"
              colorOffset={-1}
            />
            <IndexBar
              label="רמת אבזור בטיחותי"
              value={safetyLevel}
              colors={SAFETY_COLORS}
              displayHigh={8} displayLow={0}
              highLabel="בטיחות גבוהה" lowLabel="בטיחות נמוכה"
              colorOffset={0}
            />

            <p style={{
              fontFamily: 'var(--font-heebo)', fontSize: 9,
              color: 'rgba(30,30,30,0.45)', lineHeight: 1.65,
              direction: 'rtl', textAlign: 'right', margin: '10px 0 0',
            }}>
              * נתוני זיהום האוויר מבוססים על נתוני היצרן על פי בדיקות מעבדה בהתאם לתקנות EU 2017/1151. הדרגה מחושבת לפי תקנות אוויר נקי (גילוי נתוני זיהום אוויר מרכב מנועי בפרסומת), התשס&quot;ט-2009.<br />
              ** רמת האבזור הבטיחותי מחושבת לפי הוראת נוהל מספר 03/13 של משרד התחבורה.
            </p>
          </div>
        </>
      )}
    </>
  )
}
