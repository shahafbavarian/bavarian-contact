export default function Loading() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#080808',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/LOGO.PNG"
        alt="Bavarian Motors"
        style={{ height: 36, width: 'auto', opacity: 0.85 }}
      />

      <svg width="36" height="36" viewBox="0 0 36 36" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(200,169,110,0.12)" strokeWidth="2" />
        <circle
          cx="18" cy="18" r="14"
          fill="none"
          stroke="rgba(200,169,110,0.85)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="88"
          strokeDashoffset="66"
          transform="rotate(-90 18 18)"
        />
      </svg>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        svg { transform-origin: 18px 18px; }
      `}</style>
    </div>
  )
}
