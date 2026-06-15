'use client'

import { useEffect } from 'react'

// Next.js App Router catches any uncaught server-component throw here.
// Auto-reloads after 15 s so unattended screens (showroom displays) self-recover.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[error boundary]', error)
    const t = setTimeout(() => window.location.reload(), 15000)
    return () => clearTimeout(t)
  }, [error])

  return (
    <main style={{
      minHeight: '100vh', background: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center', direction: 'rtl',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/LOGO.webp" alt="Bavarian Motors" style={{ height: 56, marginBottom: 28, opacity: 0.45 }} />
      <h1 style={{ fontFamily: 'Arial, sans-serif', fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
        שגיאה זמנית
      </h1>
      <p style={{ fontFamily: 'Arial, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32, lineHeight: 1.7 }}>
        הדף יתרענן אוטומטית בעוד כמה שניות.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '12px 28px', borderRadius: 10, border: 'none',
          background: 'rgba(200,169,110,0.85)', color: '#000',
          fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 14,
          cursor: 'pointer',
        }}
      >
        נסה שוב עכשיו
      </button>
    </main>
  )
}
