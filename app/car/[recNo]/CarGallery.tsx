'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function CarGallery({ images, name, priority }: { images: string[]; name: string; priority?: boolean }) {
  const [idx, setIdx] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  if (images.length === 0) return null

  function prev() { setIdx(i => (i - 1 + images.length) % images.length) }
  function next() { setIdx(i => (i + 1) % images.length) }

  function onTouchStart(e: React.TouchEvent) { setTouchStartX(e.touches[0].clientX) }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return
    const dx = e.changedTouches[0].clientX - touchStartX
    if (Math.abs(dx) > 40) dx > 0 ? prev() : next()
    setTouchStartX(null)
  }

  return (
    <div style={{ direction: 'ltr' }}>
      {/* Main image */}
      <div
        style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#111', overflow: 'hidden' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Image
          src={images[idx]}
          alt={`${name} תמונה ${idx + 1}`}
          fill
          sizes="100vw"
          style={{ objectFit: 'cover' }}
          priority={idx === 0 && priority}
        />
        {/* Subtle top fade — blends gallery into black page background */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '30%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={next}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {/* Counter */}
            <div style={{
              position: 'absolute', bottom: 10, right: 12,
              fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.7)',
              background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: 10,
            }}>
              {idx + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails — shown only if 3+ images */}
      {images.length >= 3 && (
        <div style={{ display: 'flex', gap: 4, padding: '6px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                flexShrink: 0,
                width: 60, height: 40,
                borderRadius: 6, overflow: 'hidden',
                border: `2px solid ${i === idx ? 'rgba(200,169,110,0.8)' : 'transparent'}`,
                padding: 0, cursor: 'pointer', position: 'relative',
              }}
            >
              <Image src={src} alt="" fill sizes="60px" style={{ objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
