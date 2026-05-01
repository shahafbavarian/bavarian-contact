'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const THRESHOLD = 68
const MAX_PULL = 88
const NAV_H = 52
const R = 13
const CIRC = 2 * Math.PI * R

type Phase = 'idle' | 'pulling' | 'ready' | 'refreshing'

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
      // Elastic damping curve
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
        setPhase('refreshing')
        router.refresh()
        setTimeout(() => { setPhase('idle'); setPull(0); pullRef.current = 0 }, 1400)
      } else {
        setPhase('idle'); setPull(0); pullRef.current = 0
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
  const indicatorTop = phase === 'refreshing'
    ? NAV_H + 14
    : NAV_H + Math.max(2, pull - 42)

  return (
    <div
      ref={scrollRef}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain' }}
    >
      {phase !== 'idle' && (
        <>
          <style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: indicatorTop,
              left: '50%',
              transform: 'translateX(-50%)',
              transition: phase === 'refreshing' ? 'top 0.22s ease' : 'none',
              pointerEvents: 'none',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
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
        </>
      )}
      {children}
    </div>
  )
}
