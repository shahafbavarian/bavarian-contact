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

export default function CarVideoScreen({ youtubeUrl, carName }: { youtubeUrl: string; carName: string }) {
  const [muted, setMuted] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoId = extractVideoId(youtubeUrl)
  if (!videoId) return null

  // youtube-nocookie loads faster and skips cookie consent
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&disablekb=1&enablejsapi=1`

  function toggleMute() {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: muted ? 'unMute' : 'mute', args: [] }),
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

      {/* Car name — top left */}
      <div style={{
        position: 'absolute',
        top: 'calc(18px + env(safe-area-inset-top, 0px))',
        left: 16,
        zIndex: 10,
        direction: 'ltr',
        textAlign: 'left',
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: 'var(--font-heebo)',
          fontWeight: 700,
          fontSize: 15,
          color: '#fff',
          textShadow: '0 1px 8px rgba(0,0,0,0.8)',
          lineHeight: 1.2,
        }}>
          {carName}
        </div>
      </div>

      {/* Sound button — bottom right, prominent */}
      <button
        onClick={toggleMute}
        style={{
          position: 'absolute',
          bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
          right: 20,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderRadius: 24,
          background: muted ? 'rgba(0,0,0,0.72)' : 'rgba(200,169,110,0.9)',
          border: `1px solid ${muted ? 'rgba(255,255,255,0.25)' : 'transparent'}`,
          color: muted ? '#fff' : '#000',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s',
        }}
      >
        {muted ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
              <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>הפעל סאונד</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
              <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>השתק</span>
          </>
        )}
      </button>
    </div>
  )
}
