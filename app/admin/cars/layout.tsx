import React from 'react'
import CarsNav from './CarsNav'

// The car-fleet section is its own area with its own nav (the global admin nav
// hides itself on /admin/cars). Two tabs: car management + tracking/analytics.
export default function CarsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <CarsNav />
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  )
}
