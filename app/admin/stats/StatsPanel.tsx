'use client'

import { useState, useMemo } from 'react'
import type { Event } from '@/lib/supabase'
import { sourceLabel } from '../labels'

type Period = '24h' | '30d' | '365d' | 'all'

const PERIOD_LABELS: Record<Period, string> = {
  '24h': '24 שעות',
  '30d': 'חודש אחרון',
  '365d': 'שנה אחרונה',
  'all': 'הכל',
}

function cutoff(period: Period): Date | null {
  if (period === 'all') return null
  const d = new Date()
  if (period === '24h') d.setHours(d.getHours() - 24)
  else if (period === '30d') d.setDate(d.getDate() - 30)
  else if (period === '365d') d.setDate(d.getDate() - 365)
  return d
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div style={{
      border: '1px solid rgba(200,169,110,0.12)',
      borderRadius: 10,
      padding: '20px 24px',
      background: 'rgba(255,255,255,0.02)',
    }}>
      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-heebo)', fontSize: 40, fontWeight: 700, color: 'rgba(200,169,110,0.9)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function BreakdownRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ flex: 1, fontFamily: 'var(--font-heebo)', fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(200,169,110,0.8)', minWidth: 32, textAlign: 'left' }}>{count}</div>
      <div style={{ width: 100, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'rgba(200,169,110,0.5)', borderRadius: 2 }} />
      </div>
      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.25)', minWidth: 32, textAlign: 'left' }}>{pct}%</div>
    </div>
  )
}

export default function StatsPanel({ events }: { events: Event[] }) {
  const [period, setPeriod] = useState<Period>('24h')

  const filtered = useMemo(() => {
    const cut = cutoff(period)
    if (!cut) return events
    return events.filter(e => new Date(e.created_at) >= cut)
  }, [events, period])

  const pageviews = filtered.filter(e => e.type === 'pageview')
  const waClicks = filtered.filter(e => e.type === 'wa_click')
  const phoneClicks = filtered.filter(e => e.type === 'phone_click')

  const waByDevice = {
    mobile: waClicks.filter(e => e.device === 'mobile').length,
    desktop: waClicks.filter(e => e.device === 'desktop').length,
  }

  const sourceBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of pageviews) {
      const key = e.utm_source ?? '(ישיר)'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [pageviews])

  return (
    <div>
      {/* Debug: total raw events */}
      {events.length > 0 && (
        <div style={{ marginBottom: 16, fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          סה״כ {events.length} אירועים בבסיס הנתונים · מוצגים {filtered.length} לתקופה הנבחרת
        </div>
      )}

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28, direction: 'ltr' }}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => {
          const active = p === period
          return (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                fontFamily: 'var(--font-inter)',
                fontSize: 12,
                cursor: 'pointer',
                background: active ? 'rgba(200,169,110,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? 'rgba(200,169,110,0.35)' : 'rgba(255,255,255,0.08)'}`,
                color: active ? 'rgba(200,169,110,0.9)' : 'rgba(255,255,255,0.35)',
                transition: 'all 0.15s',
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          )
        })}
      </div>

      {/* Main stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
        <StatCard label="צפיות בעמוד" value={pageviews.length} />
        <StatCard
          label="לחיצות ווצאפ"
          value={waClicks.length}
          sub={`מובייל: ${waByDevice.mobile} · דסקטופ: ${waByDevice.desktop}`}
        />
        <StatCard label="לחיצות טלפון" value={phoneClicks.length} />
      </div>

      {/* Source breakdown */}
      {sourceBreakdown.length > 0 && (
        <div style={{
          border: '1px solid rgba(200,169,110,0.1)',
          borderRadius: 10,
          padding: '20px 24px',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 16 }}>
            מקורות צפיות
          </div>
          {sourceBreakdown.map(([src, count]) => (
            <BreakdownRow
              key={src}
              label={src === '(ישיר)' ? '(ישיר)' : (sourceLabel(src) ?? src)}
              count={count}
              total={pageviews.length}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>
          אין נתונים לתקופה זו
        </div>
      )}
    </div>
  )
}
