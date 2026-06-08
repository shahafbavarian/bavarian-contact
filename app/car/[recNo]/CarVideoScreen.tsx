'use client'

import { useRef, useState, useEffect } from 'react'

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/shorts/')[1].split('/')[0]
      return u.searchParams.get('v')
    }
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0]
  } catch {}
  return null
}

export default function CarVideoScreen({ youtubeUrl, carName }: { youtubeUrl: string; carName: string }) {
  const [loaded, setLoaded] = useState(false)
  const [muted, setMuted] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoId = extractVideoId(youtubeUrl)

  // Load iframe only when scrolled into view — scroll = user gesture = autoplay works
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setLoaded(true) },
      { threshold: 0.5 }
    )
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Hide fixed UI (a11y widget + CTA bar) when video screen is visible
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new IntersectionObserver(
      ([e]) => {
        const hidden = e.isIntersecting
        for (const sel of ['[data-a11y-widget]', '[data-cta-bar]']) {
          const el = document.querySelector<HTMLElement>(sel)
          if (!el) continue
          el.style.opacity = hidden ? '0' : ''
          el.style.pointerEvents = hidden ? 'none' : ''
        }
      },
      { threshold: 0.5 }
    )
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Unmute on hardware volume key press
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'AudioVolumeUp' || e.key === 'AudioVolumeDown' || e.key === 'VolumeUp' || e.key === 'VolumeDown') {
        setMuted(false)
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
          'https://www.youtube-nocookie.com'
        )
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!videoId) return null

  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&disablekb=1&enablejsapi=1`

  function toggleMute() {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: muted ? 'unMute' : 'mute', args: [] }),
      'https://www.youtube-nocookie.com'
    )
    setMuted(m => !m)
  }

  return (
    <div
      ref={containerRef}
      style={{ height: '100dvh', scrollSnapAlign: 'start', position: 'relative', background: '#000', overflow: 'hidden' }}
    >
      {/* Thumbnail — visible instantly before iframe loads */}
      {!loaded && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }}
        />
      )}

      {/* iframe — loads only after scroll into view */}
      {loaded && (
        <iframe
          ref={iframeRef}
          src={src}
          allow="autoplay; fullscreen"
          dir="ltr"
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'calc(100dvh * 9 / 16)',
            height: '100dvh',
            minWidth: '100%',
            border: 'none',
            direction: 'ltr',
          }}
        />
      )}

      {/* Sound button — top right, above everything */}
      {loaded && (
        <button
          onClick={toggleMute}
          style={{
            position: 'absolute',
            top: 'calc(16px + env(safe-area-inset-top, 0px))',
            right: 16,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 18px',
            borderRadius: 28,
            background: muted ? 'rgba(0,0,0,0.78)' : 'rgba(200,169,110,0.95)',
            border: `1.5px solid ${muted ? 'rgba(255,255,255,0.3)' : 'transparent'}`,
            color: muted ? '#fff' : '#000',
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            transition: 'all 0.2s',
          }}
        >
          {muted ? (
            <>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
                <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
              <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 14, fontWeight: 700 }}>הפעל סאונד</span>
            </>
          ) : (
            <>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
                <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 14, fontWeight: 700 }}>השתק</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
