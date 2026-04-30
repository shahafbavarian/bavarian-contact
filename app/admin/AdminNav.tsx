'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin', label: 'פניות' },
  { href: '/admin/stats', label: 'סטטיסטיקות' },
  { href: '/admin/preview', label: 'תצוגה מקדימה' },
]

export default function AdminNav() {
  const path = usePathname()

  return (
    <nav style={{
      height: 52,
      background: '#0c0c0c',
      borderBottom: '1px solid rgba(200,169,110,0.13)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      flexShrink: 0,
      direction: 'rtl',
      gap: 0,
    }}>
      {/* Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/LOGO.PNG" alt="Bavarian Motors" style={{ height: 34, width: 'auto', marginLeft: 16 }} />
      <div style={{ width: 1, height: 24, background: 'rgba(200,169,110,0.2)', marginLeft: 16 }} />

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        {NAV_ITEMS.map(item => {
          const active = path === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                fontFamily: 'var(--font-heebo)',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.38)',
                background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                textDecoration: 'none',
                borderBottom: active ? '2px solid rgba(200,169,110,0.55)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* External link to main site */}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 6,
          fontFamily: 'var(--font-inter)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.3)',
          textDecoration: 'none',
          border: '1px solid rgba(255,255,255,0.08)',
          letterSpacing: '0.03em',
          direction: 'ltr',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <path d="M13 3L3 13M13 3H7M13 3V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        לאתר
      </a>
    </nav>
  )
}
