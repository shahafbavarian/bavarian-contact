'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

// Print control for the car page.
//
// The sheet markup is rendered on the server and handed in as `children`, so
// pressing print performs NO network request and cannot fail on its own — if
// the car page rendered, the sheet prints. The sheet is only mounted while
// printing (via a portal on <body>), which keeps its cover image and QR off the
// critical path of a normal page view.
export default function CarPrintButton({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const printedRef = useRef(false)

  useEffect(() => { setMounted(true) }, [])

  const startPrint = useCallback(() => {
    setPreparing(prev => {
      if (prev) return prev // already preparing — ignore repeat clicks
      printedRef.current = false
      setSheetOpen(true)
      return true
    })
  }, [])

  // Legacy entry point: /car/[recNo]/print now redirects here with ?print=1,
  // so old links and bookmarks still land on a working print dialog.
  useEffect(() => {
    let wants = false
    try {
      wants = new URLSearchParams(window.location.search).get('print') === '1'
    } catch {}
    if (!wants) return

    // Drop the param so a reload doesn't re-open the dialog.
    try {
      const params = new URLSearchParams(window.location.search)
      params.delete('print')
      const q = params.toString()
      window.history.replaceState({}, '', window.location.pathname + (q ? `?${q}` : ''))
    } catch {}

    startPrint()
  }, [startPrint])

  // Once the sheet is in the DOM, wait for its images (logo, cover, QR) to
  // settle, then open the print dialog.
  useEffect(() => {
    if (!sheetOpen) return
    const el = sheetRef.current
    if (!el) return
    let cancelled = false

    const imgs = Array.from(el.querySelectorAll('img'))
    const settled = imgs.map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>(resolve => {
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          })
    )

    // A slow or broken asset must never leave the user stuck on "מכין…" —
    // print with whatever has arrived after 5s.
    const deadline = new Promise<void>(resolve => setTimeout(resolve, 5000))

    Promise.race([Promise.all(settled).then(() => undefined), deadline]).then(() => {
      if (cancelled || printedRef.current) return
      printedRef.current = true
      setPreparing(false)
      window.print()
    })

    return () => { cancelled = true }
  }, [sheetOpen])

  // Tear the sheet back down once the dialog closes.
  useEffect(() => {
    if (!sheetOpen) return
    function done() { setSheetOpen(false); setPreparing(false) }
    window.addEventListener('afterprint', done)
    return () => window.removeEventListener('afterprint', done)
  }, [sheetOpen])

  return (
    <>
      <style>{`
        /* Desktop-only control, matching the previous placement. */
        @media (max-width: 767px) { [data-print-btn] { display: none !important; } }
        @media print { [data-print-btn] { display: none !important; } }
      `}</style>

      <button
        type="button"
        onClick={startPrint}
        data-print-btn
        aria-label="הדפסה"
        aria-busy={preparing}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(14,14,14,0.88)',
          border: '1px solid rgba(200,169,110,0.28)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          cursor: preparing ? 'default' : 'pointer',
          color: 'rgba(200,169,110,0.7)',
          opacity: preparing ? 0.55 : 1,
          transition: 'opacity 0.2s',
          padding: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
      </button>

      {mounted && sheetOpen && createPortal(
        <div ref={sheetRef}>{children}</div>,
        document.body
      )}
    </>
  )
}
