'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        position: 'fixed', top: 16, right: 16, zIndex: 100,
        padding: '8px 20px', borderRadius: 8, cursor: 'pointer',
        background: '#111', color: '#fff', border: 'none',
        fontFamily: 'Heebo, Arial, sans-serif', fontSize: 14, fontWeight: 700,
      }}
      className="no-print"
    >
      🖨️ הדפס
    </button>
  )
}
