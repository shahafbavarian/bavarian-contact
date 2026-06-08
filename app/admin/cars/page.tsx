'use client'

import { useState, useEffect } from 'react'
import type { CarSummary } from '@/lib/scraper'

const GOLD = 'rgba(200,169,110,0.9)'
const GOLD_DIM = 'rgba(200,169,110,0.5)'
const GOLD_BORDER = 'rgba(200,169,110,0.15)'

function getMake(name: string): string {
  const twoWord = ['Land Rover', 'Rolls-Royce', 'Aston Martin', 'Alfa Romeo']
  for (const m of twoWord) { if (name.startsWith(m)) return m }
  return name.split(' ')[0] ?? name
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/shorts/')[1].split('/')[0]
      return u.searchParams.get('v')
    }
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0]
  } catch {}
  return null
}

export default function AdminCarsPage() {
  const [cars, setCars] = useState<CarSummary[]>([])
  const [videos, setVideos] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/cars?basic=1').then(r => r.json()),
      fetch('/api/car-videos').then(r => r.json()),
    ]).then(([carsData, videosData]) => {
      setCars((carsData.cars ?? []).filter((c: CarSummary) => c.imageUrl))
      setVideos(videosData)
      setLoading(false)
    })
  }, [])

  async function save(recNo: string) {
    setSaving(true)
    await fetch('/api/car-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rec_no: recNo, youtube_url: draft.trim() }),
    })
    setVideos(prev => {
      const next = { ...prev }
      if (draft.trim()) next[recNo] = draft.trim()
      else delete next[recNo]
      return next
    })
    setSaving(false)
    setEditing(null)
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1, direction: 'rtl' }}>
      <header style={{
        padding: '20px 40px',
        borderBottom: `1px solid ${GOLD_BORDER}`,
        background: 'rgba(255,255,255,0.012)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.3em', color: GOLD_DIM, textTransform: 'uppercase', margin: '0 0 3px' }}>ניהול</p>
        <h1 style={{ fontFamily: 'var(--font-heebo)', fontWeight: 300, fontSize: 20, color: '#fff', margin: 0 }}>
          סרטוני רכבים
          {!loading && <span style={{ fontSize: 13, color: GOLD_DIM, fontWeight: 400, marginRight: 10 }}>{cars.length} רכבים</span>}
        </h1>
      </header>

      <div style={{ height: 1, background: `linear-gradient(to left, transparent, ${GOLD_DIM}, transparent)`, margin: '0 40px' }} />

      <div style={{ padding: '24px 16px', maxWidth: 600, margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <div style={{ width: 120, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: GOLD, animation: 'shimmer 1.6s ease-in-out infinite' }} />
            </div>
            <style>{`@keyframes shimmer { 0%{width:0;margin-left:0} 50%{width:100%;margin-left:0} 100%{width:0;margin-left:100%} }`}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cars.map(car => {
              const make = getMake(car.name)
              const model = car.name.slice(make.length).trim()
              const hasVideo = !!videos[car.recNo]
              const isEditing = editing === car.recNo

              return (
                <div key={car.recNo} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isEditing ? 'rgba(200,169,110,0.35)' : GOLD_BORDER}`,
                  borderRadius: 12,
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
                    {/* Thumbnail */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={car.imageUrl} alt={car.name} style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 7, flexShrink: 0 }} />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0, direction: 'ltr', textAlign: 'left' }}>
                      <div style={{ fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {make}
                      </div>
                      {model && (
                        <div style={{ fontFamily: 'var(--font-heebo)', fontSize: 12, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {model}
                        </div>
                      )}
                      {hasVideo && !isEditing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <polygon points="5,3 19,12 5,21" fill="rgba(200,169,110,0.8)" />
                          </svg>
                          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: GOLD_DIM }}>יש סרטון</span>
                        </div>
                      )}
                    </div>

                    {/* Edit button */}
                    <button
                      onClick={() => {
                        if (isEditing) { setEditing(null); return }
                        setEditing(car.recNo)
                        setDraft(videos[car.recNo] ?? '')
                      }}
                      style={{
                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                        background: isEditing ? 'rgba(200,169,110,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isEditing ? 'rgba(200,169,110,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        color: isEditing ? GOLD : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>

                  {/* Edit panel */}
                  {isEditing && (
                    <div style={{ padding: '0 12px 12px', borderTop: `1px solid ${GOLD_BORDER}` }}>
                      <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontFamily: 'var(--font-heebo)', fontSize: 12, color: 'rgba(255,255,255,0.45)', direction: 'rtl' }}>
                          קישור YouTube (Shorts או Watch)
                        </label>
                        <input
                          type="url"
                          value={draft}
                          onChange={e => setDraft(e.target.value)}
                          placeholder="https://www.youtube.com/shorts/..."
                          dir="ltr"
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${draft && !extractVideoId(draft) ? 'rgba(255,80,80,0.5)' : GOLD_BORDER}`,
                            borderRadius: 8, padding: '8px 10px',
                            fontFamily: 'var(--font-inter)', fontSize: 12,
                            color: '#fff', outline: 'none',
                          }}
                        />
                        {draft && !extractVideoId(draft) && (
                          <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 11, color: 'rgba(255,100,100,0.8)' }}>קישור לא תקין</span>
                        )}
                        {draft && extractVideoId(draft) && (
                          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(100,200,100,0.8)' }}>
                            ✓ מזוהה: {extractVideoId(draft)}
                          </span>
                        )}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => save(car.recNo)}
                            disabled={saving || (!!draft && !extractVideoId(draft))}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 8,
                              background: GOLD, color: '#000',
                              fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 13,
                              border: 'none', cursor: saving ? 'wait' : 'pointer',
                              opacity: saving || (!!draft && !extractVideoId(draft)) ? 0.5 : 1,
                            }}
                          >
                            {saving ? 'שומר...' : 'שמור'}
                          </button>
                          {hasVideo && (
                            <button
                              onClick={() => { setDraft(''); save(car.recNo) }}
                              style={{
                                padding: '8px 14px', borderRadius: 8,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,100,100,0.7)',
                                fontFamily: 'var(--font-heebo)', fontSize: 13,
                                cursor: 'pointer',
                              }}
                            >
                              הסר
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
