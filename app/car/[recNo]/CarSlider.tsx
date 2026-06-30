'use client'

import { useState, useRef, useEffect } from 'react'
import CarVideoScreen from './CarVideoScreen'
import CarCTA from './CarCTA'
import CarIndices from './CarIndices'
import ShareButton from './ShareButton'
import AccessibilityWidget from '@/app/components/AccessibilityWidget'

const GOLD = 'rgba(200,169,110,0.8)'

function PrintButton({ recNo, style }: { recNo: string; style?: React.CSSProperties }) {
  return (
    <a
      href={`/car/${recNo}/print`}
      target="_blank"
      rel="noopener noreferrer"
      data-print-btn
      style={{
        position: 'fixed',
        top: 152,
        right: 18,
        zIndex: 9998,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: '50%',
        background: 'rgba(14,14,14,0.88)',
        border: '1px solid rgba(200,169,110,0.28)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'rgba(200,169,110,0.7)',
        ...style,
      }}
      aria-label="הדפסה"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"/>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8"/>
      </svg>
    </a>
  )
}

export default function CarSlider({
  children,
  desktopLeft,
  desktopRight,
  videoUrls,
  carName,
  recNo,
  pollutionGrade,
  safetyLevel,
  images,
}: {
  children: React.ReactNode
  desktopLeft: React.ReactNode
  desktopRight: React.ReactNode
  videoUrls: string[]
  carName: string
  recNo: string
  pollutionGrade: number | null
  safetyLevel: number | null
  images: string[]
}) {
  // Fixed screens: 0 = car details, 1..N = videos. No free scrolling — only
  // absolute jumps between full screens (project rule #2).
  const N = videoUrls.length
  const [screen, setScreen] = useState(0)
  const [videoReady, setVideoReady] = useState(false) // first video buffered
  const [isDesktop, setIsDesktop] = useState(false)
  const mobileContainerRef = useRef<HTMLDivElement>(null)
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const wheelLockRef = useRef(false)

  const onVideo = screen > 0

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── MOBILE: enable scroll only once the first video is ready ─────────
  useEffect(() => {
    if (isDesktop || !mobileContainerRef.current) return
    mobileContainerRef.current.style.overflowY = (N > 0 && videoReady) ? 'scroll' : 'hidden'
  }, [videoReady, isDesktop, N])

  // ── MOBILE: derive the active screen from scroll position ───────────
  useEffect(() => {
    if (isDesktop) return
    const el = mobileContainerRef.current
    if (!el) return
    function onScroll() {
      const idx = Math.round(el!.scrollTop / el!.clientHeight)
      setScreen(prev => (prev === idx ? prev : idx))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [isDesktop])

  // ── MOBILE: hide/show fixed overlays whenever we leave the car screen ─
  useEffect(() => {
    if (isDesktop) return
    for (const sel of ['[data-a11y-widget]', '[data-ci-trigger]', '[data-scroll-hint]', '[data-share-btn]']) {
      const el = document.querySelector<HTMLElement>(sel)
      if (!el) continue
      el.style.opacity = onVideo ? '0' : ''
      el.style.pointerEvents = onVideo ? 'none' : ''
      el.style.transition = 'opacity 0.2s'
    }
  }, [onVideo, isDesktop])

  // ── DESKTOP: wheel steps one screen at a time (gallery → v1 → v2 …) ──
  useEffect(() => {
    if (!isDesktop || N === 0) return
    const el = leftPanelRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      if (wheelLockRef.current) return
      if (Math.abs(e.deltaY) < 30) return
      const dir = e.deltaY > 0 ? 1 : -1
      setScreen(s => {
        if (dir > 0 && s === 0 && !videoReady) return 0 // wait for first video
        return Math.max(0, Math.min(s + dir, N))
      })
      wheelLockRef.current = true
      setTimeout(() => { wheelLockRef.current = false }, 700)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [isDesktop, videoReady, N])

  // ── DESKTOP LAYOUT ──────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <>
        <style>{`
          @keyframes hintSpin  { to { transform: rotate(360deg); } }
          @keyframes hintBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
          [data-cta-bar]     { display: none !important; }
          [data-a11y-widget]  { display: none !important; }
          [data-ci-trigger]   { display: none !important; }
        `}</style>

        <div style={{
          display: 'flex', height: '100dvh', overflow: 'hidden',
          background: '#000', direction: 'ltr',
        }}>

          {/* ── Left panel: gallery (always) + video layers (one per video) ── */}
          <div
            ref={leftPanelRef}
            style={{ flex: 1, position: 'relative', height: '100dvh', overflow: 'hidden', background: '#000' }}
          >
            {N > 0 ? (
              <>
                {/* Gallery layer — fades out when any video is active */}
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  opacity: screen === 0 ? 1 : 0,
                  transition: 'opacity 0.45s ease',
                  pointerEvents: screen === 0 ? 'auto' : 'none',
                  overflow: 'hidden',
                }}>
                  <div style={{ flexShrink: 0 }}>{desktopLeft}</div>

                  {/* Hint: fills remaining black space below gallery */}
                  <div style={{
                    flex: 1, minHeight: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none', overflow: 'hidden',
                  }}>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
                      borderRadius: 20, padding: '12px 20px',
                    }}>
                      {!videoReady ? (
                        <>
                          <div style={{ width: 20, height: 20, border: `2px solid rgba(200,169,110,0.18)`, borderTopColor: GOLD, borderRadius: '50%', animation: 'hintSpin 0.9s linear infinite' }} />
                          <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 11, color: 'rgba(200,169,110,0.5)', whiteSpace: 'nowrap' }}>סרטון בטעינה</span>
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ animation: 'hintBounce 2s ease-in-out infinite' }}>
                            <path d="M8 13V3M4 7l4-4 4 4" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 11, color: 'rgba(200,169,110,0.7)', whiteSpace: 'nowrap' }}>
                            {N > 1 ? 'גלגל לסרטונים' : 'גלגל לסרטון'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Video layers — one per URL */}
                {videoUrls.map((url, i) => (
                  <div
                    key={`${recNo}-vid-${i}`}
                    style={{
                      position: 'absolute', inset: 0,
                      opacity: screen === i + 1 ? 1 : 0,
                      transition: 'opacity 0.45s ease',
                      pointerEvents: screen === i + 1 ? 'auto' : 'none',
                    }}
                  >
                    <CarVideoScreen
                      youtubeUrl={url} carName={carName}
                      isActive={screen === i + 1}
                      load={screen >= i}
                      drivesHint={i === 0}
                      onReady={() => { if (i === 0) setVideoReady(true) }}
                      onBack={() => setScreen(i)}
                    />
                  </div>
                ))}
              </>
            ) : (
              /* No video — gallery fills the full left panel */
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                {desktopLeft}
              </div>
            )}
          </div>

          {/* ── Right panel: info + form (always visible) ── */}
          <div style={{
            width: 'clamp(380px, 36vw, 480px)',
            height: '100dvh',
            overflowY: 'auto',
            flexShrink: 0,
            background: '#060606',
            borderLeft: '1px solid rgba(200,169,110,0.1)',
          }}>
            {desktopRight}
          </div>
        </div>

        <CarIndices pollutionGrade={pollutionGrade} safetyLevel={safetyLevel} />
        <PrintButton recNo={recNo} style={{ position: 'fixed', top: 16, left: 16 }} />
      </>
    )
  }

  // ── MOBILE LAYOUT ───────────────────────────────────────────────────
  return (
    <div
      ref={mobileContainerRef}
      style={{
        height: '100dvh',
        overflowY: 'hidden',
        scrollSnapType: 'y mandatory',
        overscrollBehavior: 'none',
        background: '#000',
      }}
    >
      <div style={{
        height: '100dvh', overflow: 'hidden', flexShrink: 0,
        scrollSnapAlign: 'start', scrollSnapStop: 'always',
      }}>
        {children}
      </div>

      {videoUrls.map((url, i) => (
        <CarVideoScreen
          key={`${recNo}-vid-${i}`}
          youtubeUrl={url} carName={carName}
          isActive={screen === i + 1}
          load={screen >= i}
          drivesHint={i === 0}
          onReady={() => { if (i === 0) setVideoReady(true) }}
          onBack={() => mobileContainerRef.current?.scrollTo({ top: i * (mobileContainerRef.current?.clientHeight ?? 0), behavior: 'smooth' })}
        />
      ))}

      <CarCTA carName={carName} recNo={recNo} />
      <AccessibilityWidget top={50} right={18} />
      <ShareButton images={images} recNo={recNo} />
      <CarIndices pollutionGrade={pollutionGrade} safetyLevel={safetyLevel} />
    </div>
  )
}
