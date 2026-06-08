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

function sendCommand(iframe: HTMLIFrameElement | null, func: string) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func, args: [] }),
    'https://www.youtube-nocookie.com'
  )
}

export default function CarVideoScreen({ youtubeUrl, carName }: { youtubeUrl: string; carName: string }) {
  const [visible, setVisible] = useState(false)
  const [videoReady, setVideoReady] = useState(false) // true once YouTube fires onStateChange=1
  const [muted, setMuted] = useState(true)
  const mutedRef = useRef(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoId = extractVideoId(youtubeUrl)

  // Track when video section is scrolled into view
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

  // Hide accessibility widget when video is visible
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

  // Listen for YouTube playback events:
  // - onStateChange=1 (playing): mark ready + re-apply mute state
  // - onStateChange=1 after rewind/loop: re-apply mute state
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (typeof e.data !== 'string') return
      try {
        const data = JSON.parse(e.data)
        if (data.event === 'onStateChange' && data.info === 1) {
          setVideoReady(true)
          sendCommand(iframeRef.current, mutedRef.current ? 'mute' : 'unMute')
        }
      } catch {}
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Hardware volume key → unmute
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'AudioVolumeUp' || e.key === 'AudioVolumeDown' || e.key === 'VolumeUp' || e.key === 'VolumeDown') {
        mutedRef.current = false
        setMuted(false)
        sendCommand(iframeRef.current, 'unMute')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!videoId) return null

  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&disablekb=1&enablejsapi=1&hl=en`

  function toggleMute() {
    const next = !mutedRef.current
    mutedRef.current = next
    sendCommand(iframeRef.current, next ? 'mute' : 'unMute')
    setMuted(next)
  }

  // Thumbnail stays visible until YouTube confirms it's actually playing
  const showThumbnail = !videoReady

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      style={{ height: '100dvh', scrollSnapAlign: 'start', position: 'relative', background: '#000', overflow: 'hidden', outline: 'none' }}
    >
      {/* iframe — loads immediately on page mount, hidden behind thumbnail until ready */}
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
        }}
      />

      {/* Thumbnail — covers iframe until video is actually playing */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbnailUrl}
        alt=""
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: showThumbnail ? 0.85 : 0,
          transition: showThumbnail ? 'none' : 'opacity 0.5s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Loading spinner — visible when scrolled to video but not yet playing */}
      {visible && showThumbnail && (
        <>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 44, height: 44,
            border: '3px solid rgba(255,255,255,0.15)',
            borderTopColor: 'rgba(200,169,110,0.85)',
            borderRadius: '50%',
            animation: 'spin 0.9s linear infinite',
            pointerEvents: 'none',
          }} />
        </>
      )}

      {/* Sound button — shown once video is playing */}
      {visible && videoReady && (
        <button
          onClick={toggleMute}
          style={{
            position: 'absolute',
            bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
            right: 20,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 14,
            borderRadius: '50%',
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
              <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
              <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      )}
    </div>
  )
}
