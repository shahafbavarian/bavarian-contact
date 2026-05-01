'use client'
import { useState, useEffect } from 'react'

const SCREENS = [
  { id: 'mobile',   label: 'מובייל',      sub: 'iPhone 14 · 390×844',  w: 390,  h: 844  },
  { id: 'tablet',   label: 'טאבלט',       sub: 'iPad · 768×1024',       w: 768,  h: 1024 },
  { id: 'hd',       label: '16:9',        sub: '1280×720',              w: 1280, h: 720  },
  { id: 'ipadpro',  label: 'iPad Pro',    sub: '1366×1024',             w: 1366, h: 1024 },
  { id: 'mbp',      label: 'MacBook Pro', sub: '1512×982',              w: 1512, h: 982  },
]

const NAV_H = 52
const TOOLBAR_H = 48
const PADDING = 20

export default function PreviewPage() {
  const [screenIdx, setScreenIdx] = useState(2)
  const [dims, setDims] = useState({ w: 1280, h: 800 })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    function update() {
      setDims({ w: window.innerWidth, h: window.innerHeight })
    }
    update()
    setScreenIdx(window.innerWidth < 1024 ? 0 : 2)
    setReady(true)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const screen = SCREENS[screenIdx]
  const availW = dims.w - PADDING * 2
  const availH = dims.h - NAV_H - TOOLBAR_H - PADDING * 2
  const scale = Math.min(availW / screen.w, availH / screen.h, 1)
  const isMobileFrame = screen.w < 500

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#111' }}>

      {/* ─── Toolbar ─── */}
      <div style={{
        height: TOOLBAR_H,
        background: '#0e0e0e',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 6,
        flexShrink: 0,
        direction: 'ltr',
        overflowX: 'auto',
      }}>
        {SCREENS.map((s, i) => {
          const active = i === screenIdx
          return (
            <button
              key={s.id}
              onClick={() => setScreenIdx(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 6,
                background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
                color: active ? '#fff' : 'rgba(255,255,255,0.38)',
                fontSize: 12,
                fontFamily: 'var(--font-inter)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              {s.id === 'mobile' && (
                <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                  <rect x="1" y="1" width="8" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="5" cy="11.5" r="0.6" fill="currentColor" />
                </svg>
              )}
              {s.id === 'tablet' && (
                <svg width="11" height="14" viewBox="0 0 11 14" fill="none">
                  <rect x="1" y="1" width="9" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="5.5" cy="11.5" r="0.6" fill="currentColor" />
                </svg>
              )}
              {!['mobile', 'tablet'].includes(s.id) && (
                <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                  <rect x="1" y="1" width="13" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              )}
              {s.label}
              <span style={{ opacity: 0.4, fontSize: 10 }}>{s.sub}</span>
            </button>
          )
        })}
      </div>

      {/* ─── Preview Area ─── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: PADDING,
      }}>
        {ready && (
          <div style={{
            position: 'relative',
            transformOrigin: 'center center',
            transform: `scale(${scale})`,
            width: screen.w,
            height: screen.h,
            flexShrink: 0,
            borderRadius: isMobileFrame ? 44 : 4,
            overflow: 'hidden',
            boxShadow: isMobileFrame
              ? '0 0 0 8px #1c1c1c, 0 0 0 9px rgba(255,255,255,0.07), 0 32px 120px rgba(0,0,0,0.95)'
              : '0 0 0 1px rgba(255,255,255,0.08), 0 20px 80px rgba(0,0,0,0.9)',
          }}>
            <iframe
              src="/"
              style={{ width: screen.w, height: screen.h, border: 'none', display: 'block' }}
            />
            {/* Transparent overlay — lets touch events bubble up to pull-to-refresh */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} />
          </div>
        )}
      </div>

    </div>
  )
}
