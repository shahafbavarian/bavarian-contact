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
    if (Math.abs(dx) > 25) dx > 0 ? prev() : next()
    setTouchStartX(null)
  }

  // Preload adjacent images so swipe feels instant
  const prevIdx = (idx - 1 + images.length) % images.length
  const nextIdx = (idx + 1) % images.length

  return (
    <div style={{ direction: 'ltr', display: 'flex', flexDirection: 'column' }}>
      {/* Preload hints for adjacent images */}
      {images.length > 1 && (
        <>
          <link rel="preload" as="image" href={images[nextIdx]} />
          {images.length > 2 && <link rel="preload" as="image" href={images[prevIdx]} />}
        </>
      )}
      {/* Main image — fixed 3:2 ratio */}
      <div
        style={{ position: 'relative', width: '100%', aspectRatio: '3/2', background: '#000', overflow: 'hidden', touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Blurred backdrop fills black bars around contained image */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }} aria-hidden="true">
          <Image src={images[idx]} alt="" fill sizes="100vw"
            style={{ objectFit: 'cover', filter: 'blur(14px)', transform: 'scale(1.08)', opacity: 0.65 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)' }} />
        </div>

        {/* Main image */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <Image
            src={images[idx]}
            alt={`${name} תמונה ${idx + 1}`}
            fill
            sizes="100vw"
            style={{ objectFit: 'contain' }}
            priority={idx === 0 && priority}
          />
        </div>

        {/* Stronger top fade — covers the title overlap zone */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '40%', zIndex: 2,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
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
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
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
              position: 'absolute', bottom: 10, right: 12, zIndex: 2,
              fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.7)',
              background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: 10,
            }}>
              {idx + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length >= 2 && (
        <div style={{ display: 'flex', gap: 4, padding: '5px 0', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
          {images.map((src, i) => i === 0 ? null : (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                flexShrink: 0, width: 76, height: 52,
                borderRadius: 6, overflow: 'hidden',
                border: `2px solid ${i === idx ? 'rgba(200,169,110,0.8)' : 'rgba(255,255,255,0.08)'}`,
                padding: 0, cursor: 'pointer', position: 'relative',
              }}
            >
              <Image src={src} alt="" fill sizes="76px" style={{ objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
