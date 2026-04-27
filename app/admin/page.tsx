import React from 'react'
import { getSupabaseAdmin, type Lead } from '@/lib/supabase'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const { data: leads, error } = await getSupabaseAdmin()
    .from('leads')
    .select('*')
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

      {/* ─── Divider ─── */}
      <div style={{ height: 1, background: 'linear-gradient(to left, transparent, rgba(200,169,110,0.4), transparent)', margin: '0 40px' }} />

      {/* ─── Content ─── */}
      <div style={{ padding: '32px 40px' }}>

        {/* Error */}
        {error && (
          <div style={{ border: '1px solid rgba(220,50,50,0.3)', background: 'rgba(220,50,50,0.05)', padding: '20px 28px', borderRadius: 4 }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: '#f87171', margin: 0 }}>
              שגיאה בטעינת הנתונים. בדוק את חיבור Supabase.
            </p>
          </div>
        )}

        {/* Empty */}
        {!error && (!leads || leads.length === 0) && (
          <div style={{ border: '1px solid rgba(200,169,110,0.1)', padding: '80px 40px', textAlign: 'center', borderRadius: 4 }}>
            <svg style={{ margin: '0 auto 16px', display: 'block', opacity: 0.2 }} width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="8" width="32" height="24" rx="1" stroke="#C8A96E" strokeWidth="1.5" />
              <path d="M4 14h32" stroke="#C8A96E" strokeWidth="1.5" />
              <path d="M12 20h16M12 26h8" stroke="#C8A96E" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0, letterSpacing: '0.05em' }}>
              אין פניות עדיין
            </p>
          </div>
        )}

        {/* Table */}
        {leads && leads.length > 0 && (
          <div style={{ border: '1px solid rgba(200,169,110,0.12)', borderRadius: 6, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }} dir="rtl">
              <thead>
                <tr style={{ background: 'rgba(200,169,110,0.05)', borderBottom: '1px solid rgba(200,169,110,0.15)' }}>
                  {['תאריך', 'שם', 'טלפון', 'הודעה', 'מקור', 'קמפיין'].map(col => (
                    <th key={col} style={{
                      padding: '14px 20px',
                      textAlign: 'right',
                      fontFamily: 'var(--font-inter)',
                      fontSize: 10,
                      letterSpacing: '0.25em',
                      color: 'rgba(200,169,110,0.75)',
                      textTransform: 'uppercase',
                      fontWeight: 400,
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(leads as Lead[]).map((lead, i) => (
                  <tr key={lead.id} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                    transition: 'background 0.15s',
                  }}>
                    <td style={{ padding: '16px 20px', fontFamily: 'var(--font-inter)', fontSize: 12, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                      {formatDate(lead.created_at)}
                    </td>
                    <td style={{ padding: '16px 20px', fontFamily: 'var(--font-heebo)', fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {lead.name || '—'}
                    </td>
                    <td style={{ padding: '16px 20px' }} dir="ltr">
                      <a href={`tel:${lead.phone}`} style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(200,169,110,0.85)', textDecoration: 'none', letterSpacing: '0.05em' }}>
                        {lead.phone}
                      </a>
                    </td>
                    <td style={{ padding: '16px 20px', fontFamily: 'var(--font-heebo)', fontSize: 13, color: 'rgba(255,255,255,0.55)', maxWidth: 280 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {lead.message || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {lead.utm_source
                        ? <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.1em', border: '1px solid rgba(255,255,255,0.12)', padding: '3px 8px', color: 'rgba(255,255,255,0.4)', borderRadius: 2 }}>{lead.utm_source}</span>
                        : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {lead.utm_campaign
                        ? <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.1em', border: '1px solid rgba(200,169,110,0.3)', padding: '3px 8px', color: 'rgba(200,169,110,0.7)', borderRadius: 2 }}>{lead.utm_campaign}</span>
                        : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </main>
  )
}
