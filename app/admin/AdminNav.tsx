'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/admin',
    label: 'פניות',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/admin/stats',
    label: 'נתונים',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/admin/preview',
    label: 'תצוגה',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
      height: 52,
      background: 'rgba(8,8,8,0.98)',
      borderBottom: '1px solid rgba(200,169,110,0.1)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      flexShrink: 0,
      direction: 'rtl',
      overflow: 'hidden',
    }}>

      {/* Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/LOGO.PNG"
        alt="Bavarian Motors"
        style={{ height: 28, width: 'auto', marginLeft: 10, opacity: 0.9, flexShrink: 0 }}
      />

      {/* Divider */}
      <div style={{ width: 1, height: 18, background: 'rgba(200,169,110,0.18)', marginLeft: 10, flexShrink: 0 }} />

      {/* Nav tabs */}
      <div style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0 }}>
        {NAV_ITEMS.map(item => {
          const active = path === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 7,
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

      {/* External link — icon only */}
      <a
        href="https://contact.bavarian-motors.co.il"
        target="_blank"
        rel="noopener noreferrer"
        title="פתח אתר"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 30,
          borderRadius: 7,
          color: 'rgba(255,255,255,0.28)',
          textDecoration: 'none',
          border: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          marginRight: 4,
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
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M13 3L3 13M13 3H7M13 3V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </nav>
  )
}
