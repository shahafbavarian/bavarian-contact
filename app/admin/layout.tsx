import React from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      overflow: 'auto',
      background: '#080808',
      direction: 'rtl',
    }}>
      {children}
    </div>
  )
}
