import React from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { getSupabaseAdmin, type Lead } from '@/lib/supabase'
import LeadsList from './LeadsList'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  noStore()
  const { data: leads, error } = await getSupabaseAdmin()
    .from('leads')
    .select('id, name, phone, message, utm_source, utm_campaign, created_at')
    .order('created_at', { ascending: false })

  return (
    <main style={{ minHeight: '100vh', padding: '0 0 60px' }}>

      {/* ─── Header ─── */}
      <header style={{
        borderBottom: '1px solid rgba(200,169,110,0.1)',
        padding: '20px 40px',
        background: 'rgba(255,255,255,0.012)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.3em', color: 'rgba(200,169,110,0.6)', textTransform: 'uppercase', margin: '0 0 3px' }}>
          ניהול
        </p>
        <h1 style={{ fontFamily: 'var(--font-heebo)', fontWeight: 300, fontSize: 20, color: '#fff', margin: 0, letterSpacing: '0.02em' }}>
          פניות נכנסות
        </h1>
      </header>

      <div style={{ height: 1, background: 'linear-gradient(to left, transparent, rgba(200,169,110,0.4), transparent)', margin: '0 40px' }} />

      {/* ─── Content ─── */}
      <div style={{ padding: '32px 40px', maxWidth: 760, margin: '0 auto' }}>

        {error && (
          <div style={{ border: '1px solid rgba(220,50,50,0.3)', background: 'rgba(220,50,50,0.05)', padding: '20px 28px', borderRadius: 8, marginBottom: 24 }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: '#f87171', margin: 0 }}>
              שגיאה: {error.message} (code: {error.code})
            </p>
          </div>
        )}

        <LeadsList initialLeads={(leads ?? []) as Lead[]} />

      </div>
    </main>
  )
}
