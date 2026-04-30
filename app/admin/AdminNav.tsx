'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/admin',
    label: 'פניות',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/admin/stats',
    label: 'סטטיסטיקות',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/admin/preview',
    label: 'תצוגה מקדימה',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function AdminNav() {
  const path = usePathname()

  return (
    <nav style={{
      height: 56,
      background: 'rgba(8,8,8,0.98)',
      borderBottom: '1px solid rgba(200,169,110,0.1)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      flexShrink: 0,
      direction: 'rtl',
      gap: 0,
      backdropFilter: 'blur(12px)',
    }}>

      {/* Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/LOGO.PNG"
        alt="Bavarian Motors"
        style={{ height: 30, width: 'auto', marginLeft: 12, opacity: 0.9, flexShrink: 0 }}
      />

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'rgba(200,169,110,0.18)', marginLeft: 12, flexShrink: 0 }} />

      {/* Nav tabs */}
      <div style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0, overflowX: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const active = path === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                fontFamily: 'var(--font-heebo)',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? '#fff' : 'rgba(255,255,255,0.35)',
                background: active ? 'rgba(200,169,110,0.1)' : 'transparent',
                textDecoration: 'none',
                border: `1px solid ${active ? 'rgba(200,169,110,0.22)' : 'transparent'}`,
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span style={{ color: active ? 'rgba(200,169,110,0.85)' : 'rgba(255,255,255,0.25)', display: 'flex' }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* External link */}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        title="פתח אתר"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 8,
          color: 'rgba(255,255,255,0.28)',
          textDecoration: 'none',
          border: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.28)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
        }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M13 3L3 13M13 3H7M13 3V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </nav>
  )
}
