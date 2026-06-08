'use client'

import { useRef, useState } from 'react'

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

export default function CarVideoScreen({ youtubeUrl }: { youtubeUrl: string }) {
  const [muted, setMuted] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoId = extractVideoId(youtubeUrl)
  if (!videoId) return null

  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&disablekb=1&enablejsapi=1`

  function toggleMute() {
    const fn = muted ? 'unMute' : 'mute'
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: fn, args: [] }),
      '*'
    )
    setMuted(m => !m)
  }

  return (
    <div style={{
      height: '100dvh',
      scrollSnapAlign: 'start',
      position: 'relative',
      background: '#000',
      overflow: 'hidden',
    }}>
      {/* Fullscreen iframe — 9:16 centred */}
      <iframe
        ref={iframeRef}
        src={src}
        allow="autoplay; fullscreen"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100dvh * 9 / 16)',
          height: '100dvh',
          minWidth: '100%',
          border: 'none',
        }}
      />

      {/* Mute / unmute button */}
      <button
        onClick={toggleMute}
        style={{
          position: 'absolute',
          bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          right: 20,
          zIndex: 10,
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}
      >
        {muted ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
            <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
            <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Scroll back down hint */}
      <div style={{
        position: 'absolute',
        top: 'calc(18px + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        zIndex: 10,
        opacity: 0.55,
        pointerEvents: 'none',
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M4 9l4 4 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 11, color: '#fff' }}>גלול חזרה</span>
      </div>
    </div>
  )
}
