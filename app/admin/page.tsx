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
        borderBottom: '1px solid rgba(200,169,110,0.15)',
        padding: '28px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.015)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/LOGO.PNG" alt="Bavarian Motors" style={{ height: 52, width: 'auto' }} />
          <div style={{ width: 1, height: 36, background: 'rgba(200,169,110,0.25)' }} />
          <div>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.3em', color: 'rgba(200,169,110,0.7)', textTransform: 'uppercase', margin: 0 }}>
              ניהול
            </p>
            <h1 style={{ fontFamily: 'var(--font-heebo)', fontWeight: 300, fontSize: 22, color: '#fff', margin: 0, letterSpacing: '0.02em' }}>
              פניות נכנסות
            </h1>
          </div>
        </div>

        <div style={{ textAlign: 'left' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', margin: '0 0 4px', textTransform: 'uppercase' }}>
            סה״כ פניות
          </p>
          <p style={{ fontFamily: 'var(--font-heebo)', fontSize: 32, fontWeight: 700, color: 'rgba(200,169,110,0.9)', margin: 0, lineHeight: 1 }}>
            {leads?.length ?? 0}
          </p>
        </div>
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
