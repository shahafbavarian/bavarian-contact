import React from 'react'
import AdminNav from './AdminNav'
import PullToRefreshContainer from './PullToRefresh'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: '#080808',
      direction: 'rtl',
    }}>
      <AdminNav />
      <PullToRefreshContainer>
        {children}
      </PullToRefreshContainer>
    </div>
  )
}
