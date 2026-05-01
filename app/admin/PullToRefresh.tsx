'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const THRESHOLD = 68
const MAX_PULL = 90
const LOCK_Y = 64   // translateY when refreshing
const R = 13
const CIRC = 2 * Math.PI * R

type Phase = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'returning'

export default function PullToRefreshContainer({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const dragging = useRef(false)
  const pullRef = useRef(0)
  const [pull, setPull] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop > 2) return
      startY.current = e.touches[0].clientY
      dragging.current = true
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) {
        if (pullRef.current > 0) { pullRef.current = 0; setPull(0); setPhase('idle') }
        return
      }
      // Elastic damping
      const d = Math.min(Math.pow(dy, 0.62) * 4.2, MAX_PULL)
      pullRef.current = d
      setPull(d)
      setPhase(d >= THRESHOLD ? 'ready' : 'pulling')
      if (dy > 8) e.preventDefault()
    }

    const onTouchEnd = () => {
      if (!dragging.current) return
      dragging.current = false
      if (pullRef.current >= THRESHOLD) {
        // Lock content down, start refresh
        setPhase('refreshing')
        setPull(LOCK_Y)
        pullRef.current = LOCK_Y
        router.refresh()
        setTimeout(() => {
          setPhase('returning')
          setPull(0)
          pullRef.current = 0
          setTimeout(() => setPhase('idle'), 320)
        }, 1400)
      } else {
        setPhase('returning')
        setPull(0)
        pullRef.current = 0
        setTimeout(() => setPhase('idle'), 320)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [router])

  const progress = Math.min(pull / THRESHOLD, 1)
  const arcOffset = phase === 'refreshing' ? CIRC * 0.22 : CIRC * (1 - progress)
  const isAnimating = phase === 'returning' || phase === 'refreshing'
  const showIndicator = phase !== 'idle'

  return (
    <div
      ref={scrollRef}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain', position: 'relative' }}
    >
      <style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Indicator — sits at top, revealed by content moving down */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: LOCK_Y,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          opacity: showIndicator ? 1 : 0,
          pointerEvents: 'none',
        }}
      >
        <svg
          width="32" height="32" viewBox="0 0 32 32"
          style={{
            animation: phase === 'refreshing' ? 'ptr-spin 0.85s linear infinite' : 'none',
            transformOrigin: '16px 16px',
          }}
        >
          <circle cx="16" cy="16" r={R} fill="none" stroke="rgba(200,169,110,0.12)" strokeWidth="1.5" />
          <circle
            cx="16" cy="16" r={R}
            fill="none"
            stroke="rgba(200,169,110,0.9)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={arcOffset}
            transform="rotate(-90 16 16)"
          />
        </svg>
        <span style={{
          fontFamily: 'var(--font-inter)',
          fontSize: 9,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: phase === 'ready' ? 'rgba(200,169,110,0.85)' : 'rgba(255,255,255,0.28)',
          transition: 'color 0.18s',
        }}>
          {phase === 'refreshing' ? 'מרענן' : phase === 'ready' ? 'שחרר' : 'משוך'}
        </span>
      </div>

      {/* Content — slides down on pull */}
      <div style={{
        transform: `translateY(${pull}px)`,
        transition: isAnimating ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
        willChange: 'transform',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  )
}
