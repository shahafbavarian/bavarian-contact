'use client'

import { useMemo, useState } from 'react'
import type { EventRow, LeadRow } from './page'

const GOLD = 'rgba(200,169,110,0.9)'
const GOLD_BORDER = 'rgba(200,169,110,0.14)'

type Period = '24h' | '7d' | '30d' | '365d' | 'all'
const PERIOD_LABELS: Record<Period, string> = {
  '24h': '24 שעות', '7d': '7 ימים', '30d': 'חודש', '365d': 'שנה', 'all': 'הכל',
}

function cutoff(period: Period): number | null {
  if (period === 'all') return null
  const now = Date.now()
  const day = 24 * 3600 * 1000
  if (period === '24h') return now - day
  if (period === '7d') return now - 7 * day
  if (period === '30d') return now - 30 * day
  return now - 365 * day
}

function parseRecNo(utmCampaign: string | null): string | null {
  if (!utmCampaign) return null
  const m = utmCampaign.match(/recNo=(\d+)/i)
  return m ? m[1] : null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem',
  })
}

type CarCounts = {
  recNo: string
  name: string
  views: number
  slideshow: number
  print: number
  wa: number
  phone: number
  share: number
  formOpen: number
  video: number
  leads: number
}

type SortKey = 'name' | 'views' | 'scans' | 'wa' | 'phone' | 'share' | 'formOpen' | 'video' | 'leads'

function StatCard({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      border: `1px solid ${accent ? 'rgba(200,169,110,0.3)' : GOLD_BORDER}`,
      borderRadius: 10, padding: '16px 18px',
      background: accent ? 'rgba(200,169,110,0.05)' : 'rgba(255,255,255,0.02)',
    }}>
      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', marginBottom: 7 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-heebo)', fontSize: 32, fontWeight: 700, color: GOLD, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export default function FleetDashboard({
  events, leads: initialLeads, carNames, carImages,
}: { events: EventRow[]; leads: LeadRow[]; carNames: Record<string, string>; carImages: Record<string, string> }) {
  const [period, setPeriod] = useState<Period>('30d')
  const [leads, setLeads] = useState(initialLeads)
  const [sortKey, setSortKey] = useState<SortKey>('views')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [deleting, setDeleting] = useState<string | null>(null)

  const cut = cutoff(period)
  const fEvents = useMemo(() => events.filter(e => cut === null || new Date(e.created_at).getTime() >= cut), [events, cut])
  const fLeads  = useMemo(() => leads.filter(l => cut === null || new Date(l.created_at).getTime() >= cut), [leads, cut])

  // Only car-attributed events feed the car KPIs / table, so the headline
  // numbers reconcile exactly with the per-car rows. (Landing-page events have
  // no rec_no and live in the main /admin/stats page.)
  const carEvents = useMemo(() => fEvents.filter(e => e.rec_no), [fEvents])

  // ── KPIs (car-scoped) ───────────────────────────────────────────────
  const k = useMemo(() => {
    const by = (t: string) => carEvents.filter(e => e.type === t)
    const qr = by('qr_scan')
    return {
      views: by('pageview').length,
      scans: qr.length,
      scansSlideshow: qr.filter(e => e.utm_source !== 'print').length,
      scansPrint: qr.filter(e => e.utm_source === 'print').length,
      wa: by('wa_click').length,
      phone: by('phone_click').length,
      share: by('share').length,
      formOpen: by('form_open').length,
      video: by('video_view').length,
      leads: fLeads.length,
    }
  }, [carEvents, fLeads])

  // ── Per-car aggregation ─────────────────────────────────────────────
  const carName = (recNo: string) => carNames[recNo] ?? `רכב ${recNo}`

  const carRows = useMemo<CarCounts[]>(() => {
    const map = new Map<string, CarCounts>()
    const ensure = (recNo: string) => {
      let c = map.get(recNo)
      if (!c) { c = { recNo, name: carName(recNo), views: 0, slideshow: 0, print: 0, wa: 0, phone: 0, share: 0, formOpen: 0, video: 0, leads: 0 }; map.set(recNo, c) }
      return c
    }
    for (const e of carEvents) {
      const c = ensure(e.rec_no!)
      if (e.type === 'pageview') c.views++
      else if (e.type === 'qr_scan') { if (e.utm_source === 'print') c.print++; else c.slideshow++ }
      else if (e.type === 'wa_click') c.wa++
      else if (e.type === 'phone_click') c.phone++
      else if (e.type === 'share') c.share++
      else if (e.type === 'form_open') c.formOpen++
      else if (e.type === 'video_view') c.video++
    }
    for (const l of fLeads) {
      const rec = l.rec_no || parseRecNo(l.utm_campaign)
      if (!rec) continue
      ensure(rec).leads++
    }
    return Array.from(map.values())
  }, [carEvents, fLeads, carNames])

  const sortedCars = useMemo(() => {
    const val = (c: CarCounts): number | string => {
      switch (sortKey) {
        case 'name': return c.name
        case 'views': return c.views
        case 'scans': return c.slideshow + c.print
        case 'wa': return c.wa
        case 'phone': return c.phone
        case 'share': return c.share
        case 'formOpen': return c.formOpen
        case 'video': return c.video
        case 'leads': return c.leads
      }
    }
    const arr = [...carRows]
    arr.sort((a, b) => {
      const va = val(a), vb = val(b)
      let cmp: number
      if (typeof va === 'string' || typeof vb === 'string') cmp = String(va).localeCompare(String(vb), 'he')
      else cmp = va - vb
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [carRows, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc') }
  }

  // ── Leads with resolved car name ────────────────────────────────────
  const leadsView = useMemo(() => fLeads.map(l => {
    const rec = l.rec_no || parseRecNo(l.utm_campaign)
    const car = rec ? (carNames[rec] ?? l.utm_source ?? `רכב ${rec}`) : (l.utm_source ?? null)
    return { ...l, car }
  }), [fLeads, carNames])

  async function deleteLead(id: string) {
    if (!confirm('למחוק ליד זה לצמיתות?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' })
      if (res.ok) setLeads(prev => prev.filter(l => l.id !== id))
    } finally { setDeleting(null) }
  }

  function exportLeads() {
    const lines = leadsView.map((l, i) => {
      const parts = [`${i + 1}. ${l.name || 'ללא שם'} | ${l.phone}`]
      if (l.car) parts.push(`   🚗 ${l.car}`)
      if (l.message) parts.push(`   💬 ${l.message}`)
      parts.push(`   🕐 ${formatDate(l.created_at)}`)
      return parts.join('\n')
    })
    const text = [`📋 לידים – Bavarian Motors`, `סה״כ: ${leadsView.length}`, '', ...lines].join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const th: React.CSSProperties = {
    fontFamily: 'var(--font-inter)', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
    color: 'rgba(255,255,255,0.4)', padding: '8px 6px', whiteSpace: 'nowrap',
    cursor: 'pointer', userSelect: 'none',
  }
  const td: React.CSSProperties = {
    fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(255,255,255,0.75)',
    padding: '9px 6px', textAlign: 'center', whiteSpace: 'nowrap',
  }
  const arrow = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 22, flexWrap: 'wrap' }}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => {
          const active = p === period
          return (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '5px 14px', borderRadius: 6,
              fontFamily: 'var(--font-heebo)', fontSize: 12, cursor: 'pointer',
              background: active ? 'rgba(200,169,110,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? 'rgba(200,169,110,0.35)' : 'rgba(255,255,255,0.08)'}`,
              color: active ? GOLD : 'rgba(255,255,255,0.4)', transition: 'all 0.15s',
            }}>
              {PERIOD_LABELS[p]}
            </button>
          )
        })}
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        <StatCard label="כניסות לרכבים" value={k.views} />
        <StatCard label="סריקות QR" value={k.scans} sub={`סלייד: ${k.scansSlideshow} · הדפסה: ${k.scansPrint}`} accent />
        <StatCard label="לחיצות ווצאפ" value={k.wa} />
        <StatCard label="לחיצות טלפון" value={k.phone} />
        <StatCard label="צפיות בסרטון" value={k.video} />
        <StatCard label="פתחו טופס" value={k.formOpen} />
        <StatCard label="שיתופים" value={k.share} />
        <StatCard label="לידים" value={k.leads} accent />
      </div>

      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: '0 0 28px' }}>
        מוצגים נתונים לתקופה: {PERIOD_LABELS[period]} · {carEvents.length} אירועי רכבים · {fLeads.length} לידים
      </p>

      {/* Per-car table */}
      <h2 style={{ fontFamily: 'var(--font-heebo)', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: '0 0 12px' }}>
        פילוח לפי רכב
      </h2>
      {sortedCars.length === 0 ? (
        <div style={{ border: `1px solid ${GOLD_BORDER}`, borderRadius: 10, padding: '40px 20px', textAlign: 'center', fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 40 }}>
          אין עדיין פעילות מתועדת לרכבים בתקופה זו
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: `1px solid ${GOLD_BORDER}`, borderRadius: 10, marginBottom: 40 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
                <th style={{ ...th, textAlign: 'right', paddingRight: 14 }} onClick={() => toggleSort('name')}>רכב{arrow('name')}</th>
                <th style={th} onClick={() => toggleSort('views')}>כניסות{arrow('views')}</th>
                <th style={th} onClick={() => toggleSort('scans')}>סריקות{arrow('scans')}</th>
                <th style={{ ...th, color: 'rgba(255,255,255,0.28)' }}>סלייד / הדפסה</th>
                <th style={th} onClick={() => toggleSort('video')}>סרטון{arrow('video')}</th>
                <th style={th} onClick={() => toggleSort('wa')}>ווצאפ{arrow('wa')}</th>
                <th style={th} onClick={() => toggleSort('phone')}>טלפון{arrow('phone')}</th>
                <th style={th} onClick={() => toggleSort('formOpen')}>טופס{arrow('formOpen')}</th>
                <th style={th} onClick={() => toggleSort('share')}>שיתוף{arrow('share')}</th>
                <th style={th} onClick={() => toggleSort('leads')}>לידים{arrow('leads')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedCars.map((c, i) => (
                <tr key={c.recNo} style={{ borderBottom: i < sortedCars.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ ...td, textAlign: 'right', paddingRight: 14, maxWidth: 240 }}>
                    {/* Opens the car page in a new tab; ?notrack=1 keeps the
                        manager's own visit out of the statistics. */}
                    <a
                      href={`/car/${c.recNo}?notrack=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="פתח עמוד רכב (לא נספר)"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', minWidth: 0 }}
                    >
                      {carImages[c.recNo] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={carImages[c.recNo]} alt="" style={{ width: 46, height: 32, objectFit: 'cover', borderRadius: 5, flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }} />
                      ) : (
                        <div style={{ width: 46, height: 32, borderRadius: 5, flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
                      )}
                      <span style={{ color: '#fff', fontFamily: 'var(--font-heebo)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    </a>
                  </td>
                  <td style={{ ...td, color: GOLD, fontWeight: 600 }}>{c.views}</td>
                  <td style={td}>{c.slideshow + c.print}</td>
                  <td style={{ ...td, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{c.slideshow} / {c.print}</td>
                  <td style={td}>{c.video}</td>
                  <td style={td}>{c.wa}</td>
                  <td style={td}>{c.phone}</td>
                  <td style={td}>{c.formOpen}</td>
                  <td style={td}>{c.share}</td>
                  <td style={{ ...td, color: c.leads > 0 ? GOLD : 'rgba(255,255,255,0.3)', fontWeight: c.leads > 0 ? 600 : 400 }}>{c.leads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leads management */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 14px' }}>
        <h2 style={{ fontFamily: 'var(--font-heebo)', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
          לידים <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontSize: 13 }}>{leadsView.length}</span>
        </h2>
        {leadsView.length > 0 && (
          <button onClick={exportLeads} title="ייצוא לווצאפ" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34,
            background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 8,
            color: 'rgba(37,211,102,0.9)', cursor: 'pointer',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor" />
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.979-1.418A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
        )}
      </div>

      {leadsView.length === 0 ? (
        <div style={{ border: `1px solid ${GOLD_BORDER}`, borderRadius: 10, padding: '40px 20px', textAlign: 'center', fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          אין לידים בתקופה זו
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leadsView.map(l => (
            <div key={l.id} style={{
              border: `1px solid ${GOLD_BORDER}`, borderRadius: 10, padding: '14px 16px',
              background: 'rgba(255,255,255,0.02)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
                  {l.name && <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 15, fontWeight: 600, color: '#fff' }}>{l.name}</span>}
                  <a href={`tel:${l.phone}`} style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: GOLD, textDecoration: 'none', direction: 'ltr' }}>{l.phone}</a>
                </div>
                {l.message && (
                  <p style={{ fontFamily: 'var(--font-heebo)', fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: '0 0 8px', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{l.message}</p>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {l.car && (
                    <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 11, color: GOLD, background: 'rgba(200,169,110,0.08)', border: '1px solid rgba(200,169,110,0.2)', borderRadius: 5, padding: '2px 8px' }}>
                      🚗 {l.car}
                    </span>
                  )}
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{formatDate(l.created_at)}</span>
                  {l.device && (
                    <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                      {l.device === 'mobile' ? 'מובייל' : 'דסקטופ'}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => deleteLead(l.id)} disabled={deleting === l.id} title="מחק" style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 8px',
                cursor: 'pointer', color: 'rgba(255,255,255,0.25)', alignSelf: 'start', opacity: deleting === l.id ? 0.4 : 1,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
