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

function exportToWhatsApp(leads: Lead[]) {
  const lines = leads.map((lead, i) => {
    const parts = [`${i + 1}. ${lead.name} | ${lead.phone}`]
    if (lead.message) parts.push(`   💬 ${lead.message}`)
    parts.push(`   🕐 ${formatDate(lead.created_at)}`)
    return parts.join('\n')
  })

  const text = [
    `📋 פניות נכנסות – Bavarian Motors`,
    `סה״כ: ${leads.length} פניות`,
    '',
    ...lines,
  ].join('\n')

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
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

  return (
    <div>

      {/* Live count + export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 36, fontWeight: 700, color: 'rgba(200,169,110,0.9)', lineHeight: 1 }}>
            {leads.length}
          </span>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
            פניות
          </span>
        </div>
        {leads.length > 0 && (
          <button
            onClick={() => exportToWhatsApp(leads)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: 'rgba(37,211,102,0.08)',
              border: '1px solid rgba(37,211,102,0.25)',
              borderRadius: 8,
              color: 'rgba(37,211,102,0.9)',
              fontFamily: 'var(--font-heebo)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(37,211,102,0.14)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,211,102,0.45)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(37,211,102,0.08)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,211,102,0.25)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor" />
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.979-1.418A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
            ייצור לווצאפ
          </button>
        )}
      </div>

      {leads.length === 0 ? (
        <div style={{ border: '1px solid rgba(200,169,110,0.1)', padding: '80px 40px', textAlign: 'center', borderRadius: 8 }}>
          <svg style={{ margin: '0 auto 16px', display: 'block', opacity: 0.2 }} width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="8" width="32" height="24" rx="1" stroke="#C8A96E" strokeWidth="1.5" />
            <path d="M4 14h32" stroke="#C8A96E" strokeWidth="1.5" />
            <path d="M12 20h16M12 26h8" stroke="#C8A96E" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0, letterSpacing: '0.05em' }}>אין פניות עדיין</p>
        </div>
      ) : (
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
              <div style={{ minWidth: 0 }}>

                {/* Name + phone */}
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

                {/* Message */}
                {lead.message && (
                  <p style={{
                    fontFamily: 'var(--font-heebo)', fontSize: 14, color: 'rgba(255,255,255,0.6)',
                    margin: '0 0 10px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {lead.message}
                  </p>
                )}

                {/* Meta */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
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

              {/* Delete */}
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
      )}
    </div>
  )
}
