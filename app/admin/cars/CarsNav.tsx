'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    href: '/admin/cars',
    label: 'ניהול רכבים',
    match: (p: string) => p === '/admin/cars',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M19 17H5a2 2 0 01-2-2V9l2-4h14l2 4v6a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="7.5" cy="17" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="16.5" cy="17" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    href: '/admin/cars/stats',
    label: 'מעקב ונתונים',
    match: (p: string) => p.startsWith('/admin/cars/stats'),
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function CarsNav() {
  const path = usePathname() ?? ''

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 20,
      height: 52,
      background: 'rgba(8,8,8,0.98)',
      borderBottom: '1px solid rgba(200,169,110,0.1)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      flexShrink: 0,
      direction: 'rtl',
      overflow: 'hidden',
    }}>
      {/* Back to the main admin */}
      <Link
        href="/admin"
        title="חזרה לניהול הראשי"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 30, height: 30, borderRadius: 7, flexShrink: 0,
          color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
          border: '1px solid rgba(255,255,255,0.08)', marginLeft: 10,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      <span style={{
        fontFamily: 'var(--font-heebo)', fontSize: 13, fontWeight: 600,
        color: 'rgba(200,169,110,0.85)', flexShrink: 0, marginLeft: 12,
      }}>
        מערך רכבים
      </span>

      <div style={{ width: 1, height: 18, background: 'rgba(200,169,110,0.18)', marginLeft: 12, flexShrink: 0 }} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0 }}>
        {TABS.map(item => {
          const active = item.match(path)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 7,
                fontFamily: 'var(--font-heebo)', fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? '#fff' : 'rgba(255,255,255,0.35)',
                background: active ? 'rgba(200,169,110,0.1)' : 'transparent',
                textDecoration: 'none',
                border: `1px solid ${active ? 'rgba(200,169,110,0.22)' : 'transparent'}`,
                transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
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
    </nav>
  )
}
