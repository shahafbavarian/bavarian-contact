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

function sendListening(iframe: HTMLIFrameElement | null) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: 'listening', id: 'car-video', channel: 'widget' }),
    'https://www.youtube-nocookie.com'
  )
}

export default function CarVideoScreen({
  youtubeUrl,
  carName,
  isActive,
  onReady,
  onBack,
}: {
  youtubeUrl: string
  carName: string
  isActive: boolean
  onReady: () => void
  onBack: () => void
}) {
  const [muted, setMuted] = useState(true)
  const mutedRef = useRef(true)
  const readyFiredRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoId = extractVideoId(youtubeUrl)

  function markReady() {
    if (readyFiredRef.current) return
    readyFiredRef.current = true
    const hint = document.querySelector<HTMLElement>('[data-scroll-hint]')
    if (hint) hint.setAttribute('data-ready', '1')
    const hintLoading = document.querySelector<HTMLElement>('[data-hint-loading]')
    const hintReady = document.querySelector<HTMLElement>('[data-hint-ready]')
    if (hintLoading) hintLoading.style.display = 'none'
    if (hintReady) hintReady.style.display = 'flex'
    onReady()
  }

  // Last-resort fallback: mark ready after 15s if playback evidence never arrives
  // (e.g. autoplay fully blocked) so the user isn't stuck on the spinner forever
  useEffect(() => {
    const t = setTimeout(markReady, 15000)
    return () => clearTimeout(t)
  }, [])

  // Handshake — retry until the player responds with onReady
  useEffect(() => {
    const t = setInterval(() => {
      if (readyFiredRef.current) { clearInterval(t); return }
      sendListening(iframeRef.current)
    }, 300)
    return () => clearInterval(t)
  }, [])

  // YouTube postMessage events — onReady triggers markReady for fast scroll-unlock
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (typeof e.data !== 'string') return
      try {
        const d = JSON.parse(e.data)
        if (d.event === 'onReady') markReady()
      } catch {}
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Apply mute state and focus when screen becomes active
  // Video autoplays muted from autoplay=1&mute=1 — never paused via postMessage
  // so iOS Safari never blocks subsequent playback
  useEffect(() => {
    if (!isActive) return
    sendCommand(iframeRef.current, 'playVideo')
    sendCommand(iframeRef.current, mutedRef.current ? 'mute' : 'unMute')
    setTimeout(() => containerRef.current?.focus(), 400)
  }, [isActive])

  // Hardware volume keys → unmute
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (['AudioVolumeUp', 'AudioVolumeDown', 'VolumeUp', 'VolumeDown'].includes(e.key)) {
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
      style={{ height: '100dvh', flexShrink: 0, position: 'relative', background: '#000', overflow: 'hidden', outline: 'none', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
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

      {/* Mute button */}
      {isActive && (
        <button
          onClick={toggleMute}
          style={{
            position: 'absolute',
            bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
            right: 18, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none',
            color: muted ? 'rgba(255,255,255,0.85)' : 'rgba(200,169,110,1)',
            cursor: 'pointer',
            filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))',
            transition: 'color 0.2s', padding: 6,
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
