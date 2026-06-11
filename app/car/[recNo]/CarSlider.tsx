'use client'

import { useState, useRef, useEffect } from 'react'
import CarVideoScreen from './CarVideoScreen'
import CarCTA from './CarCTA'
import CarIndices from './CarIndices'
import AccessibilityWidget from '@/app/components/AccessibilityWidget'

export default function CarSlider({
  children,
  youtubeUrl,
  carName,
  recNo,
  pollutionGrade,
  safetyLevel,
}: {
  children: React.ReactNode
  youtubeUrl: string
  carName: string
  recNo: string
  pollutionGrade: number | null
  safetyLevel: number | null
}) {
  const [onVideo, setOnVideo] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const touchStartY = useRef<number | null>(null)
  const touchStartX = useRef<number | null>(null)
  const outerRef = useRef<HTMLDivElement>(null)

  // Hide/show fixed overlays when switching screens
  useEffect(() => {
    for (const sel of ['[data-a11y-widget]', '[data-ci-trigger]', '[data-scroll-hint]']) {
      const el = document.querySelector<HTMLElement>(sel)
      if (!el) continue
      el.style.opacity = onVideo ? '0' : ''
      el.style.pointerEvents = onVideo ? 'none' : ''
      el.style.transition = 'opacity 0.2s'
    }
  }, [onVideo])

  // Mouse wheel for desktop
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      if (!onVideo && videoReady && e.deltaY > 30) setOnVideo(true)
      if (onVideo && e.deltaY < -30) setOnVideo(false)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onVideo, videoReady])

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null || touchStartX.current === null) return
    const dy = e.changedTouches[0].clientY - touchStartY.current
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartY.current = null
    touchStartX.current = null
    // Ignore if horizontal swipe dominates (gallery image switching)
    if (Math.abs(dx) > Math.abs(dy)) return
    if (!onVideo && videoReady && dy < -60) setOnVideo(true)
    if (onVideo && dy > 60) setOnVideo(false)
  }

  return (
    <div
      ref={outerRef}
      style={{ height: '100dvh', overflow: 'hidden', background: '#000', position: 'relative' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Sliding panel — transform kept here so fixed children below are unaffected */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        transform: onVideo ? 'translateY(-100dvh)' : 'translateY(0)',
        transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
        willChange: 'transform',
      }}>
        {/* Screen 1 */}
        <div style={{ height: '100dvh', overflow: 'hidden', flexShrink: 0 }}>
          {children}
        </div>

        {/* Screen 2 */}
        <CarVideoScreen
          youtubeUrl={youtubeUrl}
          carName={carName}
          isActive={onVideo}
          onReady={() => setVideoReady(true)}
          onBack={() => setOnVideo(false)}
        />
      </div>

      {/* Fixed elements outside transform — position:fixed works correctly here */}
      <CarCTA carName={carName} recNo={recNo} />
      <AccessibilityWidget top={50} right={18} />
      <CarIndices pollutionGrade={pollutionGrade} safetyLevel={safetyLevel} />
    </div>
  )
}
