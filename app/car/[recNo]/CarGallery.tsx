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
    <div style={{ direction: 'ltr' }}>
      {/* Preload adjacent images */}
      {images.length > 1 && (
        <>
          <link rel="preload" as="image" href={images[nextIdx]} />
          {images.length > 2 && <link rel="preload" as="image" href={images[prevIdx]} />}
        </>
      )}

      {/* ── 16:9 frame — matches modern phone screens ── */}
      <div
        style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#0d0d0d', overflow: 'hidden', touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/*
          Blurred backdrop — same image, softly out-of-focus, fills the narrow
          side-bands that appear when a 3:2 photo sits in a 16:9 frame.
          Uses a plain <img> so z-index stacking is unambiguous.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[idx]}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: 'blur(14px)',
            transform: 'scale(1.08)',
            opacity: 0.7,
          }}
        />
        {/* Controlled darkening so backdrop doesn't overpower the car */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.36)', zIndex: 1 }} />

        {/* Main image — objectFit contain: full car, never cropped */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
          <Image
            src={images[idx]}
            alt={`${name} תמונה ${idx + 1}`}
            fill
            sizes="100vw"
            style={{ objectFit: 'contain' }}
            priority={idx === 0 && priority}
          />
        </div>

        {/* Subtle edge vignette — draws focus to the car in the center */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          background: 'radial-gradient(ellipse at 50% 55%, transparent 52%, rgba(0,0,0,0.32) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Top fade — blends gallery into the title overlap zone above */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '36%', zIndex: 4,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 5,
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.14)',
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
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 5,
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.14)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div style={{
              position: 'absolute', bottom: 10, right: 12, zIndex: 5,
              fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.65)',
              background: 'rgba(0,0,0,0.48)', padding: '3px 8px', borderRadius: 10,
            }}>
              {idx + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length >= 3 && (
        <div style={{ display: 'flex', gap: 3, padding: '4px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {images.map((src, i) => i === 0 ? null : (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                flexShrink: 0, width: 52, height: 34,
                borderRadius: 5, overflow: 'hidden',
                border: `2px solid ${i === idx ? 'rgba(200,169,110,0.8)' : 'transparent'}`,
                padding: 0, cursor: 'pointer', position: 'relative',
              }}
            >
              <Image src={src} alt="" fill sizes="52px" style={{ objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
