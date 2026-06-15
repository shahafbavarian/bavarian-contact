'use client'

import { useEffect } from 'react'

// Catches errors in the root layout (fonts, metadata, etc.).
// Must include its own <html><body> because the layout is unavailable.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global error boundary]', error)
    const t = setTimeout(() => window.location.reload(), 15000)
    return () => clearTimeout(t)
  }, [error])

  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO.webp" alt="Bavarian Motors" style={{ height: 50, marginBottom: 24, opacity: 0.45 }} />
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 24 }}>שגיאה זמנית — מתרענן אוטומטית</p>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: 'rgba(200,169,110,0.85)', color: '#000',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}
        >
          נסה שוב
        </button>
      </body>
    </html>
  )
}
