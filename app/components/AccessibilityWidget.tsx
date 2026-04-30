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
  root.style.setProperty('--a11y-font-scale', s.fontSize === 2 ? '1.22' : s.fontSize === 1 ? '1.1' : '1')
  root.classList.toggle('a11y-contrast', s.contrast)
  root.classList.toggle('a11y-grayscale', s.grayscale)
  root.classList.toggle('a11y-underline', s.underlineLinks)
  root.classList.toggle('a11y-pause', s.pauseAnimations)
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

  function reset() {
    update(DEFAULT)
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
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
      {/* Global a11y styles */}
      <style>{`
        .a11y-contrast { filter: contrast(1.5) brightness(1.05); }
        .a11y-grayscale { filter: grayscale(1); }
        .a11y-contrast.a11y-grayscale { filter: contrast(1.5) brightness(1.05) grayscale(1); }
        .a11y-underline a { text-decoration: underline !important; }
        .a11y-pause *, .a11y-pause *::before, .a11y-pause *::after {
          animation-play-state: paused !important;
          transition: none !important;
        }
        html { font-size: calc(16px * var(--a11y-font-scale, 1)); }
      `}</style>

      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="פתח תפריט נגישות"
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 9999,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(20,20,20,0.92)',
          border: '1.5px solid rgba(200,169,110,0.45)',
          color: 'rgba(200,169,110,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,169,110,0.8)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 28px rgba(200,169,110,0.2)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,169,110,0.45)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.5)'
        }}
      >
        {/* Accessibility icon (person with circle) */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="5" r="2" fill="currentColor" />
          <path d="M12 8c-3 0-5 1.5-5 3.5V13h3v5h4v-5h3v-1.5C17 9.5 15 8 12 8z" fill="currentColor" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="תפריט נגישות"
          style={{
            position: 'fixed',
            bottom: 84,
            left: 24,
            zIndex: 9999,
            width: 260,
            background: 'rgba(12,12,12,0.97)',
            border: '1px solid rgba(200,169,110,0.2)',
            borderRadius: 14,
            padding: 16,
            boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
            backdropFilter: 'blur(16px)',
            direction: 'rtl',
          }}
        >
          <div style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            marginBottom: 12,
          }}>
            נגישות
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

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
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      border: `1px solid ${settings.fontSize === level ? 'rgba(200,169,110,0.5)' : 'rgba(255,255,255,0.12)'}`,
                      background: settings.fontSize === level ? 'rgba(200,169,110,0.12)' : 'transparent',
                      color: settings.fontSize === level ? 'rgba(200,169,110,0.9)' : 'rgba(255,255,255,0.5)',
                      fontFamily: 'var(--font-heebo)',
                      fontSize: [11, 13, 15][level],
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    א
                  </button>
                ))}
              </div>
            </div>

            <button style={btnStyle(settings.contrast)} onClick={() => update({ contrast: !settings.contrast })}>
              <span style={{ fontSize: 16 }}>◑</span>
              ניגודיות גבוהה
            </button>

            <button style={btnStyle(settings.grayscale)} onClick={() => update({ grayscale: !settings.grayscale })}>
              <span style={{ fontSize: 16 }}>◐</span>
              גווני אפור
            </button>

            <button style={btnStyle(settings.underlineLinks)} onClick={() => update({ underlineLinks: !settings.underlineLinks })}>
              <span style={{ fontSize: 13, textDecoration: 'underline', fontFamily: 'serif' }}>א</span>
              הדגש קישורים
            </button>

            <button style={btnStyle(settings.pauseAnimations)} onClick={() => update({ pauseAnimations: !settings.pauseAnimations })}>
              <span style={{ fontSize: 14 }}>⏸</span>
              עצור אנימציות
            </button>

          </div>

          {/* Reset */}
          {JSON.stringify(settings) !== JSON.stringify(DEFAULT) && (
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
              איפוס
            </button>
          )}
        </div>
      )}
    </>
  )
}
