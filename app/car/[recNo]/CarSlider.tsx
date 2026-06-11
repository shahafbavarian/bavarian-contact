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
  const containerRef = useRef<HTMLDivElement>(null)

  // Enable scrolling only when video is ready
  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.style.overflowY = videoReady ? 'scroll' : 'hidden'
  }, [videoReady])

  // Detect which screen is active via scroll position
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function onScroll() {
      const isVideo = el!.scrollTop > el!.clientHeight / 2
      setOnVideo(isVideo)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

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

  return (
    <div
      ref={containerRef}
      style={{
        height: '100dvh',
        overflowY: 'hidden',
        scrollSnapType: 'y mandatory',
        overscrollBehavior: 'none',
        background: '#000',
      }}
    >
      {/* Screen 1 */}
      <div style={{
        height: '100dvh',
        overflow: 'hidden',
        flexShrink: 0,
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}>
        {children}
      </div>

      {/* Screen 2 — video */}
      <CarVideoScreen
        youtubeUrl={youtubeUrl}
        carName={carName}
        isActive={onVideo}
        onReady={() => setVideoReady(true)}
        onBack={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
      />

      {/* position:fixed works correctly here — no transform on this container */}
      <CarCTA carName={carName} recNo={recNo} />
      <AccessibilityWidget top={50} right={18} />
      <CarIndices pollutionGrade={pollutionGrade} safetyLevel={safetyLevel} />
    </div>
  )
}
