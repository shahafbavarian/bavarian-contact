'use client'

import { useState, useEffect } from 'react'

type Settings = {
  fontSize: number   // 0 = normal, 1 = large, 2 = x-large
  contrast: boolean
  grayscale: boolean
  underlineLinks: boolean
  pauseAnimations: boolean
}

const DEFAULT: Settings = {
  fontSize: 0,
  contrast: false,
  grayscale: false,
  underlineLinks: false,
  pauseAnimations: false,
}

const STORAGE_KEY = 'a11y-settings'

function applySettings(s: Settings) {
  const root = document.documentElement
  // zoom scales everything including px-based inline styles
  root.style.zoom = ['1', '1.1', '1.22'][s.fontSize]
  root.classList.toggle('a11y-contrast', s.contrast)
  root.classList.toggle('a11y-grayscale', s.grayscale)
  root.classList.toggle('a11y-underline', s.underlineLinks)
  root.classList.toggle('a11y-pause', s.pauseAnimations)
  window.dispatchEvent(new Event('a11y-settings-changed'))
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = { ...DEFAULT, ...JSON.parse(saved) }
        setSettings(parsed)
        applySettings(parsed)
      }
    } catch {}
  }, [])

  function update(patch: Partial<Settings>) {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      applySettings(next)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function reset() { update(DEFAULT) }

  const isChanged = JSON.stringify(settings) !== JSON.stringify(DEFAULT)

  const rowStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${active ? 'rgba(200,169,110,0.5)' : 'rgba(255,255,255,0.1)'}`,
    background: active ? 'rgba(200,169,110,0.12)' : 'rgba(255,255,255,0.04)',
    color: active ? 'rgba(200,169,110,0.95)' : 'rgba(255,255,255,0.65)',
    fontFamily: 'var(--font-heebo)',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.15s',
    direction: 'rtl',
    textAlign: 'right',
  })

  return (
    <>
      <style>{`
        .a11y-contrast { filter: contrast(1.5) brightness(1.05); }
        .a11y-grayscale { filter: grayscale(1); }
        .a11y-contrast.a11y-grayscale { filter: contrast(1.5) brightness(1.05) grayscale(1); }
        .a11y-underline a { text-decoration: underline !important; }
        .a11y-pause *, .a11y-pause *::before, .a11y-pause *::after {
          animation-play-state: paused !important;
          transition-duration: 0s !important;
        }
      `}</style>

      {/* Trigger button — top left */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="פתח תפריט נגישות"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 9999,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(14,14,14,0.92)',
          border: `1.5px solid ${open ? 'rgba(200,169,110,0.8)' : 'rgba(200,169,110,0.4)'}`,
          color: 'rgba(200,169,110,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          transition: 'border-color 0.2s',
        }}
      >
        {/* Universal accessibility icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="4.5" r="2" fill="currentColor" />
          <path d="M7 8.5h10M12 8.5v5M9 22l3-8.5 3 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Panel — drops down from button */}
      {open && (
        <div
          role="dialog"
          aria-label="תפריט נגישות"
          style={{
            position: 'fixed',
            top: 68,
            left: 16,
            zIndex: 9999,
            width: 256,
            background: 'rgba(10,10,10,0.97)',
            border: '1px solid rgba(200,169,110,0.18)',
            borderRadius: 14,
            padding: 14,
            boxShadow: '0 8px 48px rgba(0,0,0,0.75)',
            backdropFilter: 'blur(16px)',
            direction: 'rtl',
          }}
        >
          <div style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.28)',
            marginBottom: 10,
          }}>
            נגישות
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>

            {/* Font size */}
            <div style={{
              display: 'flex',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>גודל טקסט</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(level => (
                  <button
                    key={level}
                    onClick={() => update({ fontSize: level })}
                    aria-label={['רגיל', 'גדול', 'גדול מאוד'][level]}
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      border: `1px solid ${settings.fontSize === level ? 'rgba(200,169,110,0.5)' : 'rgba(255,255,255,0.12)'}`,
                      background: settings.fontSize === level ? 'rgba(200,169,110,0.12)' : 'transparent',
                      color: settings.fontSize === level ? 'rgba(200,169,110,0.9)' : 'rgba(255,255,255,0.5)',
                      fontFamily: 'var(--font-heebo)',
                      fontSize: [11, 13, 16][level],
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    A
                  </button>
                ))}
              </div>
            </div>

            <button style={rowStyle(settings.contrast)} onClick={() => update({ contrast: !settings.contrast })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 2a10 10 0 010 20V2z" fill="currentColor" />
              </svg>
              ניגודיות גבוהה
            </button>

            <button style={rowStyle(settings.grayscale)} onClick={() => update({ grayscale: !settings.grayscale })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
              גווני אפור
            </button>

            <button style={rowStyle(settings.underlineLinks)} onClick={() => update({ underlineLinks: !settings.underlineLinks })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 3v7a6 6 0 0012 0V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M4 21h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              הדגש קישורים
            </button>

            <button style={rowStyle(settings.pauseAnimations)} onClick={() => update({ pauseAnimations: !settings.pauseAnimations })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
                <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
              </svg>
              עצור אנימציות
            </button>

          </div>

          {isChanged && (
            <button
              onClick={reset}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '7px 0',
                borderRadius: 7,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.3)',
                fontFamily: 'var(--font-heebo)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              איפוס הגדרות
            </button>
          )}
        </div>
      )}
    </>
  )
}
