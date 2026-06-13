'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print"
      style={{
        position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '12px 28px', borderRadius: 999, cursor: 'pointer',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #000 100%)',
        color: '#C8A96E', border: '1px solid rgba(200,169,110,0.45)',
        fontFamily: 'Heebo, Arial, sans-serif', fontSize: 15, fontWeight: 700,
        boxShadow: '0 8px 30px rgba(0,0,0,0.35)', letterSpacing: 0.3,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      הורד / הדפס PDF
    </button>
  )
}
