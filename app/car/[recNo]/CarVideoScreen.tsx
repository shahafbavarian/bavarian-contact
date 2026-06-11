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
  const [muted, setMuted] = useState(true)
  const mutedRef = useRef(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoId = extractVideoId(youtubeUrl)

  // When video is ready: unlock scroll (snap is already set in CSS) + update hint
  function markReady() {
    const container = document.querySelector<HTMLElement>('[data-scroll-container]')
    if (container) container.style.overflowY = 'scroll'
    const hint = document.querySelector<HTMLElement>('[data-scroll-hint]')
    if (hint) hint.setAttribute('data-ready', '1')
  }

  // Fallback: unlock after 8s if YouTube never fires the event
  useEffect(() => {
    const t = setTimeout(markReady, 8000)
    return () => clearTimeout(t)
  }, [])

  // YouTube events: onStateChange=1 means playing
  // Handle both raw format and infoDelivery wrapper
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (typeof e.data !== 'string') return
      try {
        const d = JSON.parse(e.data)
        const isPlaying =
          (d.event === 'onStateChange' && d.info === 1) ||
          (d.event === 'infoDelivery' && d.info?.playerState === 1)
        if (isPlaying) {
          markReady()
          sendCommand(iframeRef.current, mutedRef.current ? 'mute' : 'unMute')
        }
      } catch {}
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Track visibility — hide/show fixed widgets when on video screen
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting)
        if (e.isIntersecting) setTimeout(() => containerRef.current?.focus(), 400)
        for (const sel of ['[data-a11y-widget]', '[data-ci-trigger]', '[data-scroll-hint]']) {
          const el = document.querySelector<HTMLElement>(sel)
          if (!el) return
          el.style.opacity = e.isIntersecting ? '0' : ''
          el.style.pointerEvents = e.isIntersecting ? 'none' : ''
          el.style.transition = 'opacity 0.2s'
        }
      },
      { threshold: 0.5 }
    )
    obs.observe(containerRef.current)
    return () => obs.disconnect()
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

  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&disablekb=1&enablejsapi=1&hl=en`

  function toggleMute() {
    const next = !mutedRef.current
    mutedRef.current = next
    sendCommand(iframeRef.current, next ? 'mute' : 'unMute')
    setMuted(next)
  }

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      style={{ height: '100dvh', scrollSnapAlign: 'start', position: 'relative', background: '#000', overflow: 'hidden', outline: 'none' }}
    >
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

      {/* Fade at bottom — video blends into the fixed CTA bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 'calc(120px + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(to bottom, transparent 0%, rgba(8,8,8,0.97) 100%)',
        pointerEvents: 'none',
        zIndex: 2,
      }} />

      {/* Mute button — minimal floating icon */}
      {visible && (
        <button
          onClick={toggleMute}
          style={{
            position: 'absolute',
            bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
            right: 18,
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: muted ? 'rgba(255,255,255,0.85)' : 'rgba(200,169,110,1)',
            cursor: 'pointer',
            filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))',
            transition: 'color 0.2s',
            padding: 6,
          }}
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
              <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
              <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      )}
    </div>
  )
}
