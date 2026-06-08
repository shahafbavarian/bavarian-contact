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
  const [visible, setVisible] = useState(false)
  const [muted, setMuted] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoId = extractVideoId(youtubeUrl)

  // Track when video section is in view — for thumbnail fade and focus
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting)
        if (e.isIntersecting) setTimeout(() => containerRef.current?.focus(), 400)
      },
      { threshold: 0.5 }
    )
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Hide accessibility widget when video screen is visible
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new IntersectionObserver(
      ([e]) => {
        const el = document.querySelector<HTMLElement>('[data-a11y-widget]')
        if (!el) return
        el.style.opacity = e.isIntersecting ? '0' : ''
        el.style.pointerEvents = e.isIntersecting ? 'none' : ''
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
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&disablekb=1&enablejsapi=1&hl=en`

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
      tabIndex={-1}
      style={{ height: '100dvh', scrollSnapAlign: 'start', position: 'relative', background: '#000', overflow: 'hidden', outline: 'none' }}
    >
      {/* Thumbnail — fades out when video becomes visible */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbnailUrl}
        alt=""
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: visible ? 0 : 0.75,
          transition: 'opacity 0.6s ease',
          pointerEvents: 'none',
        }}
      />

      {/* iframe — loaded immediately on mount so it's ready when user scrolls */}
      <iframe
        ref={iframeRef}
        src={src}
        allow="autoplay; fullscreen"
        style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100dvh * 9 / 16)',
          height: '100dvh',
          minWidth: '100%',
          border: 'none',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}
      />

      {/* Transparent overlay — prevents iframe from stealing focus so
          hardware volume keys reach the parent page's keydown listener */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: 5 }}
        onClick={() => containerRef.current?.focus()}
      />

      {/* Sound button — above CTA bar */}
      {visible && (
        <button
          onClick={toggleMute}
          style={{
            position: 'absolute',
            bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
            right: 20,
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
