'use client'

import { useState } from 'react'
import type { Lead } from '@/lib/supabase'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Jerusalem',
  })
}

export default function LeadsList({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('למחוק ליד זה לצמיתות?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' })
      if (res.ok) setLeads(prev => prev.filter(l => l.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  if (leads.length === 0) {
    return (
      <div style={{ border: '1px solid rgba(200,169,110,0.1)', padding: '80px 40px', textAlign: 'center', borderRadius: 8 }}>
        <svg style={{ margin: '0 auto 16px', display: 'block', opacity: 0.2 }} width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="4" y="8" width="32" height="24" rx="1" stroke="#C8A96E" strokeWidth="1.5" />
          <path d="M4 14h32" stroke="#C8A96E" strokeWidth="1.5" />
          <path d="M12 20h16M12 26h8" stroke="#C8A96E" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0, letterSpacing: '0.05em' }}>אין פניות עדיין</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {leads.map(lead => (
        <div key={lead.id} style={{
          border: '1px solid rgba(200,169,110,0.12)',
          borderRadius: 10,
          padding: '20px 24px',
          background: 'rgba(255,255,255,0.02)',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '4px 16px',
          alignItems: 'start',
        }}>
          {/* Main info */}
          <div style={{ minWidth: 0 }}>

            {/* Row 1: name + phone */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              {lead.name && (
                <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 16, fontWeight: 600, color: '#fff' }}>
                  {lead.name}
                </span>
              )}
              <a href={`tel:${lead.phone}`} style={{
                fontFamily: 'var(--font-inter)', fontSize: 15, color: 'rgba(200,169,110,0.9)',
                textDecoration: 'none', letterSpacing: '0.04em', direction: 'ltr', display: 'inline-block',
              }}>
                {lead.phone}
              </a>
            </div>

            {/* Row 2: message */}
            {lead.message && (
              <p style={{
                fontFamily: 'var(--font-heebo)', fontSize: 14, color: 'rgba(255,255,255,0.6)',
                margin: '0 0 10px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {lead.message}
              </p>
            )}

            {/* Row 3: meta */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.02em' }}>
                {formatDate(lead.created_at)}
              </span>
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                מקור: <span style={{ color: lead.utm_source ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)' }}>
                  {lead.utm_source ?? '—'}
                </span>
              </span>
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                קמפיין: <span style={{ color: lead.utm_campaign ? 'rgba(200,169,110,0.8)' : 'rgba(255,255,255,0.2)' }}>
                  {lead.utm_campaign ?? '—'}
                </span>
              </span>
            </div>
          </div>

          {/* Delete button */}
          <button
            onClick={() => handleDelete(lead.id)}
            disabled={deleting === lead.id}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
              padding: '7px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.25)',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: deleting === lead.id ? 0.4 : 1,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.3)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
            title="מחק ליד"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
