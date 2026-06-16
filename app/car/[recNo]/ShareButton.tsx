'use client'

import { useState, useEffect, useMemo } from 'react'

// Mobile-only share control. Visually identical to the accessibility widget
// trigger, placed immediately to its left. Offers two actions:
//   1. Share all car photos as image files (no text) — e.g. send to WhatsApp.
//   2. Share only the link to this car's page (no images).
export default function ShareButton({ images, recNo }: { images: string[]; recNo: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [loaded, setLoaded] = useState(0)

  useEffect(() => { setMounted(true) }, [])

  // Prefetch the shareable photos in the background as soon as the page is
  // ready, so they're already in the browser cache by the time the user
  // taps "share images" — otherwise the download can outlast the brief
  // user-activation window navigator.share() requires, and the first tap
  // fails while a later tap (cache warm) succeeds.
  const shareableImages = useMemo(() => images.slice(1), [images]) // skip the cover/hero image
  useEffect(() => {
    shareableImages.forEach(url => {
      fetch(`/api/car-image?url=${encodeURIComponent(url)}`).catch(() => {})
    })
  }, [shareableImages])

  const carUrl = `https://contact.bavarian-motors.co.il/car/${recNo}`

  async function shareImages() {
    if (busy) return
    setNote(null)
    if (!shareableImages.length) { setNote('אין תמונות לשיתוף'); return }
    setBusy(true)
    setLoaded(0)
    try {
      const files = await Promise.all(shareableImages.map(async (url, i) => {
        const res = await fetch(`/api/car-image?url=${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error('image fetch failed')
        const blob = await res.blob()
        setLoaded(n => n + 1)
        const ext = (blob.type.split('/')[1] || 'jpg').split('+')[0]
        return new File([blob], `car-${recNo}-${i + 1}.${ext}`, { type: blob.type })
      }))

      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files }) // images only — no title/text/url
        setOpen(false)
      } else {
        setNote('הדפדפן לא תומך בשיתוף תמונות')
      }
    } catch (e) {
      // User dismissing the native share sheet throws AbortError — ignore it.
      if ((e as Error)?.name !== 'AbortError') {
        setNote('שגיאה בהכנת התמונות')
      } else {
        setOpen(false)
      }
    } finally {
      setBusy(false)
    }
  }

  async function shareLink() {
    setNote(null)
    try {
      if (navigator.share) {
        await navigator.share({ url: carUrl }) // link only — no images
        setOpen(false)
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(carUrl)
        setNote('הקישור הועתק')
      } else {
        setNote('שיתוף לא נתמך בדפדפן זה')
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        setNote('שגיאה בשיתוף הקישור')
      } else {
        setOpen(false)
      }
    }
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'var(--font-heebo)',
    fontSize: 14,
    cursor: busy ? 'default' : 'pointer',
    transition: 'all 0.15s',
    direction: 'rtl',
    textAlign: 'right',
    opacity: busy ? 0.5 : 1,
  }

  if (!mounted) return null

  return (
    <>
      {/* Trigger — same 44×44 gold circle as the accessibility widget, to its left */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="שיתוף"
        data-share-btn="1"
        style={{
          position: 'fixed',
          top: 50,
          right: 72,
          zIndex: 9999,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(14,14,14,0.92)',
          border: `1.5px solid ${open ? 'rgba(200,169,110,0.8)' : 'rgba(200,169,110,0.4)'}`,
          color: 'rgba(200,169,110,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          transition: 'border-color 0.2s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="18" cy="5" r="2.6" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="6" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="18" cy="19" r="2.6" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8.3 10.7l7.4-4.4M8.3 13.3l7.4 4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="אפשרויות שיתוף"
          style={{
            position: 'fixed',
            top: 102,
            right: 18,
            zIndex: 9999,
            width: 220,
            background: 'rgba(10,10,10,0.97)',
            border: '1px solid rgba(200,169,110,0.18)',
            borderRadius: 14,
            padding: 14,
            boxShadow: '0 8px 48px rgba(0,0,0,0.75)',
            backdropFilter: 'blur(16px)',
            direction: 'rtl',
          }}
        >
          <div style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.28)',
            marginBottom: 10,
          }}>
            שיתוף
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <button style={rowStyle} onClick={shareImages} disabled={busy}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8.5" cy="9" r="1.6" stroke="currentColor" strokeWidth="1.3" />
                <path d="M21 15l-5-4-5 4-2-1.5L3 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {busy ? `טוען… ${loaded}/${shareableImages.length}` : 'שיתוף תמונות'}
            </button>

            {busy && (
              <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${shareableImages.length ? (loaded / shareableImages.length) * 100 : 0}%`,
                  background: 'rgba(200,169,110,0.8)',
                  transition: 'width 0.2s ease',
                }} />
              </div>
            )}

            <button style={rowStyle} onClick={shareLink} disabled={busy}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 12a4 4 0 014-4h2a4 4 0 010 8h-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 12a4 4 0 01-4 4H9a4 4 0 010-8h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              שיתוף קישור
            </button>
          </div>

          {note && (
            <div style={{
              marginTop: 10,
              fontFamily: 'var(--font-heebo)',
              fontSize: 12,
              color: 'rgba(200,169,110,0.7)',
              textAlign: 'center',
            }}>
              {note}
            </div>
          )}
        </div>
      )}
    </>
  )
}
