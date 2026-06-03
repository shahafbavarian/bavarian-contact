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

  const prevIdx = (idx - 1 + images.length) % images.length
  const nextIdx = (idx + 1) % images.length

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {images.length > 1 && (
        <>
          <link rel="preload" as="image" href={images[nextIdx]} />
          {images.length > 2 && <link rel="preload" as="image" href={images[prevIdx]} />}
        </>
      )}

      {/* Blurred backdrop */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }} aria-hidden="true">
        <Image
          src={images[idx]}
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: 'cover', filter: 'blur(18px)', transform: 'scale(1.1)', opacity: 0.6 }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      </div>

      {/* Main image — never cropped */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: 1, touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Image
          src={images[idx]}
          alt={`${name} תמונה ${idx + 1}`}
          fill
          sizes="100vw"
          style={{ objectFit: 'contain' }}
          priority={idx === 0 && priority}
        />
      </div>

      {/* Prev / next */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 4,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(0,0,0,0.52)', border: '1px solid rgba(255,255,255,0.14)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={next}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 4,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(0,0,0,0.52)', border: '1px solid rgba(255,255,255,0.14)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div style={{
            position: 'absolute', bottom: 12, right: 12, zIndex: 4,
            fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.65)',
            background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: 10,
          }}>
            {idx + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  )
}
