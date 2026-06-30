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

type Override = { pollutionGrade: number | null; safetyLevel: number | null }

type VideoLinks = { url1: string | null; url2: string | null }

export default function AdminCarsPage() {
  const [cars, setCars] = useState<CarSummary[]>([])
  const [videos, setVideos] = useState<Record<string, VideoLinks>>({})
  const [overrides, setOverrides] = useState<Record<string, Override>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [draft2, setDraft2] = useState('')
  const [draftPollution, setDraftPollution] = useState<number | ''>('')
  const [draftSafety, setDraftSafety] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/cars?basic=1').then(r => r.json()),
      fetch('/api/car-videos').then(r => r.json()),
      fetch('/api/car-overrides').then(r => r.json()),
    ]).then(([carsData, videosData, overridesData]) => {
      setCars((carsData.cars ?? []).filter((c: CarSummary) => c.imageUrl))
      setVideos(videosData)
      setOverrides(overridesData)
      setLoading(false)
    })
  }, [])

  // Explicit args (defaulting to the current drafts) so callers like "הסר הכל"
  // can pass empty values without racing React's async setState.
  async function save(
    recNo: string,
    v1: string = draft,
    v2: string = draft2,
    pg: number | '' = draftPollution,
    sl: number | '' = draftSafety,
  ) {
    setSaving(true)
    const url1 = v1.trim()
    const url2 = v2.trim()
    await Promise.all([
      fetch('/api/car-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rec_no: recNo, youtube_url: url1, youtube_url_2: url2 }),
      }),
      fetch('/api/car-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rec_no: recNo,
          pollution_grade: pg === '' ? null : pg,
          safety_level: sl === '' ? null : sl,
        }),
      }),
    ])
    setVideos((prev: Record<string, VideoLinks>) => {
      const next = { ...prev }
      const urls = [url1, url2].filter(Boolean)
      if (urls.length) next[recNo] = { url1: urls[0], url2: urls[1] ?? null }
      else delete next[recNo]
      return next
    })
    setOverrides((prev: Record<string, Override>) => {
      const next = { ...prev }
      const pgVal = pg === '' ? null : pg
      const slVal = sl === '' ? null : sl
      if (pgVal !== null || slVal !== null) next[recNo] = { pollutionGrade: pgVal, safetyLevel: slVal }
      else delete next[recNo]
      return next
    })
    setSaving(false)
    setEditing(null)
  }

  const filtered = cars.filter(c =>
    !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase())
  )

  const selectStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${GOLD_BORDER}`,
    borderRadius: 8, padding: '8px 10px',
    fontFamily: 'var(--font-heebo)', fontSize: 13,
    color: '#fff', outline: 'none',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
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
          ניהול רכבים
          {!loading && <span style={{ fontSize: 13, color: GOLD_DIM, fontWeight: 400, marginRight: 10 }}>{filtered.length}</span>}
        </h1>
        {!loading && (
          <div style={{ position: 'relative', marginTop: 12 }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="חיפוש לפי יצרן או דגם..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${GOLD_BORDER}`,
                borderRadius: 8, padding: '8px 32px 8px 10px',
                fontFamily: 'var(--font-heebo)', fontSize: 13,
                color: '#fff', outline: 'none', direction: 'rtl',
              }}
            />
          </div>
        )}
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
            {filtered.length === 0 && (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-heebo)', paddingTop: 32 }}>
                לא נמצאו רכבים
              </p>
            )}
            {filtered.map(car => {
              const make = getMake(car.name)
              const model = car.name.slice(make.length).trim()
              const vid = videos[car.recNo]
              const videoCount = (vid?.url1 ? 1 : 0) + (vid?.url2 ? 1 : 0)
              const hasVideo = videoCount > 0
              const hasOverride = !!overrides[car.recNo]
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={car.imageUrl} alt={car.name} style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 7, flexShrink: 0 }} />

                    <div style={{ flex: 1, minWidth: 0, direction: 'ltr', textAlign: 'left' }}>
                      <div style={{ fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {make}
                      </div>
                      {model && (
                        <div style={{ fontFamily: 'var(--font-heebo)', fontSize: 12, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {model}
                        </div>
                      )}
                      {!isEditing && (hasVideo || hasOverride) && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                          {hasVideo && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                <polygon points="5,3 19,12 5,21" fill="rgba(200,169,110,0.8)" />
                              </svg>
                              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: GOLD_DIM }}>{videoCount > 1 ? `${videoCount} סרטונים` : 'סרטון'}</span>
                            </div>
                          )}
                          {hasOverride && (
                            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(100,180,255,0.7)' }}>מדדים ידניים</span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (isEditing) { setEditing(null); return }
                        setEditing(car.recNo)
                        setDraft(videos[car.recNo]?.url1 ?? '')
                        setDraft2(videos[car.recNo]?.url2 ?? '')
                        setDraftPollution(overrides[car.recNo]?.pollutionGrade ?? '')
                        setDraftSafety(overrides[car.recNo]?.safetyLevel ?? '')
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

                  {isEditing && (
                    <div style={{ padding: '0 12px 12px', borderTop: `1px solid ${GOLD_BORDER}` }}>
                      <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>

                        {/* YouTube URL 1 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontFamily: 'var(--font-heebo)', fontSize: 12, color: 'rgba(255,255,255,0.45)', direction: 'rtl' }}>
                            קישור סרטון 1 (Shorts או Watch)
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
                        </div>

                        {/* YouTube URL 2 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontFamily: 'var(--font-heebo)', fontSize: 12, color: 'rgba(255,255,255,0.45)', direction: 'rtl' }}>
                            קישור סרטון 2 (אופציונלי)
                          </label>
                          <input
                            type="url"
                            value={draft2}
                            onChange={e => setDraft2(e.target.value)}
                            placeholder="https://www.youtube.com/shorts/..."
                            dir="ltr"
                            style={{
                              width: '100%', boxSizing: 'border-box',
                              background: 'rgba(255,255,255,0.05)',
                              border: `1px solid ${draft2 && !extractVideoId(draft2) ? 'rgba(255,80,80,0.5)' : GOLD_BORDER}`,
                              borderRadius: 8, padding: '8px 10px',
                              fontFamily: 'var(--font-inter)', fontSize: 12,
                              color: '#fff', outline: 'none',
                            }}
                          />
                          {draft2 && !extractVideoId(draft2) && (
                            <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 11, color: 'rgba(255,100,100,0.8)' }}>קישור לא תקין</span>
                          )}
                          {draft2 && extractVideoId(draft2) && (
                            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(100,200,100,0.8)' }}>
                              ✓ מזוהה: {extractVideoId(draft2)}
                            </span>
                          )}
                        </div>

                        {/* Pollution grade */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontFamily: 'var(--font-heebo)', fontSize: 12, color: 'rgba(255,255,255,0.45)', direction: 'rtl' }}>
                            דרגת זיהום (1 = הכי נקי, 15 = הכי מזהם)
                          </label>
                          <select
                            value={draftPollution}
                            onChange={e => setDraftPollution(e.target.value === '' ? '' : Number(e.target.value))}
                            style={selectStyle}
                          >
                            <option value="">ללא עקיפה (ברירת מחדל)</option>
                            {Array.from({ length: 15 }, (_, i) => i + 1).map(v => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        </div>

                        {/* Safety level */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontFamily: 'var(--font-heebo)', fontSize: 12, color: 'rgba(255,255,255,0.45)', direction: 'rtl' }}>
                            רמת בטיחות (0 = הכי נמוך, 8 = הכי גבוה)
                          </label>
                          <select
                            value={draftSafety}
                            onChange={e => setDraftSafety(e.target.value === '' ? '' : Number(e.target.value))}
                            style={selectStyle}
                          >
                            <option value="">ללא עקיפה (ברירת מחדל)</option>
                            {Array.from({ length: 9 }, (_, i) => i).map(v => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => save(car.recNo)}
                            disabled={saving || (!!draft && !extractVideoId(draft)) || (!!draft2 && !extractVideoId(draft2))}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 8,
                              background: GOLD, color: '#000',
                              fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 13,
                              border: 'none', cursor: saving ? 'wait' : 'pointer',
                              opacity: saving || (!!draft && !extractVideoId(draft)) || (!!draft2 && !extractVideoId(draft2)) ? 0.5 : 1,
                            }}
                          >
                            {saving ? 'שומר...' : 'שמור'}
                          </button>
                          {(hasVideo || hasOverride) && (
                            <button
                              onClick={() => { setDraft(''); setDraft2(''); setDraftPollution(''); setDraftSafety(''); save(car.recNo, '', '', '', '') }}
                              style={{
                                padding: '8px 14px', borderRadius: 8,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,100,100,0.7)',
                                fontFamily: 'var(--font-heebo)', fontSize: 13,
                                cursor: 'pointer',
                              }}
                            >
                              הסר הכל
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
