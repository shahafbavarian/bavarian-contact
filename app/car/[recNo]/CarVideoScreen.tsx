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

function sendCommand(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func, args }),
    'https://www.youtube-nocookie.com'
  )
}

// YouTube sends no postMessage events until it receives a 'listening' handshake
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
  const isActiveRef = useRef(isActive)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoId = extractVideoId(youtubeUrl)

  useEffect(() => { isActiveRef.current = isActive }, [isActive])

  function markReady() {
    if (readyFiredRef.current) return
    readyFiredRef.current = true
    // Buffered — park the video paused at the start until the user reaches screen 2
    if (!isActiveRef.current) {
      sendCommand(iframeRef.current, 'pauseVideo')
      sendCommand(iframeRef.current, 'seekTo', [0, true])
    }
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

  // YouTube postMessage events
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (typeof e.data !== 'string') return
      try {
        const d = JSON.parse(e.data)
        if (d.event === 'onReady') markReady()
        const isPlaying =
          (d.event === 'onStateChange' && d.info === 1) ||
          (d.event === 'infoDelivery' && d.info?.playerState === 1)
        if (isPlaying && !isActive) sendCommand(iframeRef.current, 'pauseVideo')
      } catch {}
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [isActive])

  // Play/pause when screen becomes active/inactive
  useEffect(() => {
    if (isActive) {
      sendCommand(iframeRef.current, 'playVideo')
      sendCommand(iframeRef.current, mutedRef.current ? 'mute' : 'unMute')
      setTimeout(() => containerRef.current?.focus(), 400)
    } else {
      sendCommand(iframeRef.current, 'pauseVideo')
    }
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

  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&enablejsapi=1&hl=en`

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
