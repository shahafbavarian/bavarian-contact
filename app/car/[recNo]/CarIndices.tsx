'use client'

import { useState } from 'react'

const GOLD = 'rgba(200,169,110,0.9)'
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
  colorOffset: number
}) {
  if (value === null) return null

  const count = displayHigh - displayLow + 1
  const activePos = displayHigh - value
  const arrowPct = ((activePos + 0.5) / count * 100).toFixed(2)
  const activeColor = colors[value + colorOffset] ?? '#888'

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, direction: 'rtl' }}>
        <span style={{
          fontFamily: 'var(--font-heebo)', fontSize: 13, fontWeight: 500,
          color: 'rgba(255,255,255,0.85)',
        }}>
          {label}
        </span>
        <span style={{
          background: activeColor,
          color: '#fff',
          fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 13,
          borderRadius: 5, padding: '2px 8px',
          boxShadow: `0 0 8px ${activeColor}88`,
          minWidth: 22, textAlign: 'center',
        }}>
          {value}
        </span>
      </div>

      <div style={{ position: 'relative', paddingTop: 12 }}>
        <div style={{
          position: 'absolute', top: 0,
          left: `${arrowPct}%`,
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
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
                flex: 1,
                height: isActive ? 26 : 20,
                alignSelf: 'flex-end',
                background: color,
                borderRadius: 4,
                opacity: isActive ? 1 : 0.38,
                border: isActive ? '2px solid rgba(255,255,255,0.85)' : '2px solid transparent',
                boxSizing: 'border-box',
                boxShadow: isActive ? `0 0 6px ${color}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 7,
                  fontWeight: 700,
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                  lineHeight: 1,
                  userSelect: 'none',
                }}>
                  {v}
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, direction: 'ltr' }}>
          <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            {highLabel}
          </span>
          <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
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
  const [open, setOpen] = useState(false)

  if (pollutionGrade === null && safetyLevel === null) return null

  return (
    <>
      <style>{`
        @keyframes ciSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes ciFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 3, width: '100%',
          padding: '10px 14px',
          background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-heebo)', fontSize: 12,
          color: GOLD_DIM,
        }}>
          מדדי בטיחות וזיהום אוויר
        </span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: GOLD_DIM }}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Bottom sheet */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 60,
              background: 'rgba(0,0,0,0.72)',
              animation: 'ciFadeIn 0.22s ease-out',
            }}
          />

          {/* Sheet */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            zIndex: 61,
            background: '#0d0d0d',
            borderTop: '1px solid rgba(200,169,110,0.18)',
            borderRadius: '18px 18px 0 0',
            padding: '0 20px',
            paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
            animation: 'ciSlideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
          }}>
            {/* Handle */}
            <div style={{
              width: 40, height: 4,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 2,
              margin: '12px auto 0',
            }} />

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 0 18px', direction: 'rtl',
            }}>
              <span style={{
                fontFamily: 'var(--font-inter)', fontSize: 10,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                color: GOLD,
              }}>
                מדדי זיהום ובטיחות
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '50%', width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <IndexBar
              label="דרגת זיהום אוויר"
              value={pollutionGrade}
              colors={POLLUTION_COLORS}
              displayHigh={15} displayLow={1}
              highLabel="זיהום מרבי"
              lowLabel="זיהום מזערי"
              colorOffset={-1}
            />
            <IndexBar
              label="רמת אבזור בטיחותי"
              value={safetyLevel}
              colors={SAFETY_COLORS}
              displayHigh={8} displayLow={0}
              highLabel="בטיחות גבוהה"
              lowLabel="בטיחות נמוכה"
              colorOffset={0}
            />

            <p style={{
              fontFamily: 'var(--font-heebo)', fontSize: 9,
              color: 'rgba(255,255,255,0.22)', lineHeight: 1.6,
              direction: 'rtl', textAlign: 'right',
              margin: '4px 0 0',
            }}>
              *נתוני היצרן, ע&quot;פי בדיקות מעבדה תקן EU 2017/1151<br />
              **דרגת זיהום מחושבת לפי תקנות &quot;אוויר נקי&quot; (גילוי נתוני זיהום אוויר מרכב מנועי בפרסומת) תשס&quot;ט 2009
            </p>
          </div>
        </>
      )}
    </>
  )
}
