'use client'

import { useEffect, useState } from 'react'
import type { Agent } from '@/lib/agent-format'
import { initials, normalizePhone, isValidEmail } from '@/lib/agent-format'

const GOLD = 'rgba(200,169,110,0.9)'
const GOLD_DIM = 'rgba(200,169,110,0.5)'
const GOLD_BORDER = 'rgba(200,169,110,0.15)'

type Draft = { full_name: string; phone: string; email: string; title: string }
const EMPTY: Draft = { full_name: '', phone: '', email: '', title: '' }

function draftFrom(a: Agent): Draft {
  return { full_name: a.full_name, phone: a.phone, email: a.email ?? '', title: a.title ?? '' }
}

function draftError(d: Draft): string | null {
  if (!d.full_name.trim()) return 'שם מלא הוא שדה חובה'
  if (!normalizePhone(d.phone)) return 'מספר טלפון נייד לא תקין'
  if (d.email.trim() && !isValidEmail(d.email.trim())) return 'כתובת אימייל לא תקינה'
  return null
}

// Phone photos are often 5–15MB; shrink in the browser so the upload stays far
// below Vercel's request limit. The server does the final crop and encoding.
async function shrinkImage(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej()), 'image/jpeg', 0.9))
  } catch {
    return file // format the browser can't decode — let the server try
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'הפעולה נכשלה')
  return json as T
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)', border: `1px solid ${GOLD_BORDER}`,
  borderRadius: 8, padding: '9px 10px',
  fontFamily: 'var(--font-heebo)', fontSize: 16, // 16px: no iOS zoom on focus
  color: '#fff', outline: 'none',
}
const labelStyle: React.CSSProperties = { fontFamily: 'var(--font-heebo)', fontSize: 12, color: 'rgba(255,255,255,0.45)' }
const primaryBtn: React.CSSProperties = {
  flex: 1, padding: '9px 0', borderRadius: 8, background: GOLD, color: '#000',
  fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
}
const ghostBtn: React.CSSProperties = {
  padding: '9px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)',
  fontFamily: 'var(--font-heebo)', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
}
const iconBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

function Fields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const field = (key: keyof Draft, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={labelStyle}>{label}</span>
      <input value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} style={inputStyle} {...props} />
    </label>
  )
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {field('full_name', 'שם מלא *', { autoComplete: 'off', maxLength: 60 })}
      {field('phone', 'טלפון נייד *', { type: 'tel', inputMode: 'tel', dir: 'ltr', placeholder: '050-1234567', autoComplete: 'off' })}
      {field('title', 'תפקיד', { maxLength: 50, placeholder: 'לדוגמה: יועץ מכירות' })}
      {field('email', 'אימייל', { type: 'email', inputMode: 'email', dir: 'ltr', autoCapitalize: 'none', autoComplete: 'off', maxLength: 120 })}
    </div>
  )
}

function Avatar({ agent, size = 46 }: { agent: Agent; size?: number }) {
  if (agent.photo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={agent.photo_url} alt="" style={{ width: size, height: size * 1.25, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
  }
  return (
    <div style={{ width: size, height: size * 1.25, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center',
      background: 'rgba(255,255,255,0.06)', color: GOLD_DIM, fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: size * 0.34 }}>
      {initials(agent.full_name)}
    </div>
  )
}

function PhotoPicker({ onPick, busy, label }: { onPick: (f: File) => void; busy: boolean; label: string }) {
  return (
    <label style={{ ...ghostBtn, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: busy ? 0.5 : 1, cursor: busy ? 'wait' : 'pointer' }}>
      <input type="file" accept="image/*" hidden disabled={busy}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f) }} />
      {busy ? 'מעלה…' : label}
    </label>
  )
}

type ImportRow = { name: string; state: 'pending' | 'ok' | 'error'; text: string }
type SourcePerson = { order?: number; recNo: number; name: string; role?: string | null; phone: string; email?: string | null; photo_url?: string | null }

function describeImport(r: { status: string; photo: string }): string {
  const base = r.status === 'created' ? 'נוסף' : 'כבר קיים'
  if (r.photo === 'imported') return base + ' · תמונה יובאה'
  if (r.photo === 'failed') return base + ' · ייבוא התמונה נכשל'
  if (r.photo === 'none') return base + ' · ללא תמונה'
  return base
}

export default function AdminTeamPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState<Draft>(EMPTY)
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [busy, setBusy] = useState<string | null>(null) // what is in flight
  const [importLog, setImportLog] = useState<ImportRow[] | null>(null)

  useEffect(() => {
    api<{ agents: Agent[] }>('/api/admin/agents')
      .then(r => setAgents(r.agents))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const replace = (a: Agent) => setAgents(prev => prev.map(x => (x.id === a.id ? a : x)))

  async function run(tag: string, fn: () => Promise<void>) {
    setBusy(tag); setError(null)
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  async function uploadPhoto(agentId: string, file: File) {
    const body = new FormData()
    body.append('file', await shrinkImage(file), 'photo.jpg')
    const r = await api<{ agent: Agent }>(`/api/admin/agents/${agentId}/photo`, { method: 'POST', body })
    return r.agent
  }

  // One request per person: visible progress, and a failure never undoes the rest.
  async function runImport(file: File) {
    let people: SourcePerson[]
    try {
      const json = JSON.parse(await file.text())
      people = (Array.isArray(json) ? json : json.people) as SourcePerson[]
      if (!Array.isArray(people)) throw new Error()
    } catch {
      setError('הקובץ אינו קובץ מיפוי צוות תקין (JSON)')
      return
    }
    // Only real people: a name and a source id. Empty/glitch records are skipped.
    people = people
      .filter(p => p && typeof p.name === 'string' && p.name.trim() && Number.isInteger(p.recNo))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    if (!people.length) { setError('לא נמצאו אנשי צוות בקובץ'); return }

    setError(null); setBusy('import')
    const log: ImportRow[] = people.map(p => ({ name: p.name, state: 'pending', text: 'ממתין…' }))
    setImportLog([...log])
    for (let i = 0; i < people.length; i++) {
      try {
        const r = await api<{ status: string; photo: string }>('/api/admin/agents/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(people[i]),
        })
        log[i] = { name: people[i].name, state: r.photo === 'failed' ? 'error' : 'ok', text: describeImport(r) }
      } catch (e) {
        log[i] = { name: people[i].name, state: 'error', text: (e as Error).message }
      }
      setImportLog([...log])
    }
    try { setAgents((await api<{ agents: Agent[] }>('/api/admin/agents')).agents) } catch {}
    setBusy(null)
  }

  const create = () => run('create', async () => {
    const err = draftError(newDraft)
    if (err) throw new Error(err)
    let { agent } = await api<{ agent: Agent }>('/api/admin/agents', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newDraft),
    })
    setAgents(prev => [...prev, agent])
    if (newPhoto) { agent = await uploadPhoto(agent.id, newPhoto); replace(agent) }
    setNewDraft(EMPTY); setNewPhoto(null); setAdding(false)
  })

  const save = (a: Agent) => run('save:' + a.id, async () => {
    const err = draftError(draft)
    if (err) throw new Error(err)
    const r = await api<{ agent: Agent }>(`/api/admin/agents/${a.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    })
    replace(r.agent); setEditing(null)
  })

  const toggleActive = (a: Agent) => run('active:' + a.id, async () => {
    if (a.active && !confirm(`להשבית את ${a.full_name}? הוא יוסתר מעמוד הצוות והעמוד האישי שלו יפנה לעמוד הצוות.`)) return
    const r = await api<{ agent: Agent }>(`/api/admin/agents/${a.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !a.active }),
    })
    replace(r.agent)
  })

  const move = (i: number, dir: -1 | 1) => run('move', async () => {
    const j = i + dir
    if (j < 0 || j >= agents.length) return
    const next = [...agents];
    [next[i], next[j]] = [next[j], next[i]]
    setAgents(next)
    await api('/api/admin/agents/reorder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: next.map(a => a.id) }),
    })
  })

  const activeCount = agents.filter(a => a.active).length

  return (
    <div style={{ overflowY: 'auto', flex: 1, direction: 'rtl' }}>
      <header style={{
        padding: '20px 40px', borderBottom: `1px solid ${GOLD_BORDER}`,
        background: 'rgba(255,255,255,0.012)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.3em', color: GOLD_DIM, textTransform: 'uppercase', margin: '0 0 3px' }}>ניהול</p>
          <h1 style={{ fontFamily: 'var(--font-heebo)', fontWeight: 300, fontSize: 20, color: '#fff', margin: 0 }}>
            צוות
            {!loading && <span style={{ fontSize: 13, color: GOLD_DIM, fontWeight: 400, marginRight: 10 }}>{activeCount} פעילים</span>}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/team" target="_blank" rel="noopener noreferrer" style={{ ...ghostBtn, textDecoration: 'none' }}>עמוד הצוות</a>
          <label style={{ ...ghostBtn, opacity: busy === 'import' ? 0.5 : 1, cursor: busy === 'import' ? 'wait' : 'pointer' }}>
            <input type="file" accept="application/json,.json" hidden disabled={busy === 'import'}
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) runImport(f) }} />
            {busy === 'import' ? 'מייבא…' : 'ייבוא מקובץ'}
          </label>
          {!adding && <button onClick={() => { setAdding(true); setError(null) }} style={{ ...primaryBtn, flex: 'none', padding: '9px 16px' }}>+ הוסף</button>}
        </div>
      </header>

      <div style={{ padding: '20px 16px 60px', maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {error && (
          <div style={{ border: '1px solid rgba(220,50,50,0.3)', background: 'rgba(220,50,50,0.06)', padding: '12px 16px', borderRadius: 8,
            fontFamily: 'var(--font-heebo)', fontSize: 13, color: '#f87171' }}>
            {error}
          </div>
        )}

        {importLog && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${GOLD_BORDER}`, borderRadius: 12, padding: 14, display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 14, color: '#fff' }}>
                ייבוא · {importLog.filter(r => r.state !== 'pending').length}/{importLog.length}
              </span>
              {busy !== 'import' && <button onClick={() => setImportLog(null)} style={{ ...ghostBtn, padding: '4px 10px' }}>סגור</button>}
            </div>
            {importLog.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontFamily: 'var(--font-heebo)', fontSize: 13 }}>
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>{r.name}</span>
                <span style={{ color: r.state === 'error' ? '#f87171' : r.state === 'ok' ? 'rgba(100,200,120,0.85)' : 'rgba(255,255,255,0.35)', textAlign: 'left' }}>{r.text}</span>
              </div>
            ))}
            {busy !== 'import' && importLog.some(r => r.state === 'error') && (
              <div style={{ ...labelStyle, marginTop: 4 }}>אפשר להריץ את הייבוא שוב — מי שכבר יובא לא ייווצר פעמיים, ורק מה שחסר יושלם.</div>
            )}
          </div>
        )}

        {adding && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(200,169,110,0.35)', borderRadius: 12, padding: 14, display: 'grid', gap: 12 }}>
            <div style={{ fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 15, color: '#fff' }}>איש צוות חדש</div>
            <Fields draft={newDraft} setDraft={setNewDraft} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <PhotoPicker busy={false} label={newPhoto ? 'החלף תמונה' : 'בחר תמונה (רשות)'} onPick={setNewPhoto} />
              {newPhoto && <span style={{ ...labelStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{newPhoto.name}</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={create} disabled={busy === 'create'} style={{ ...primaryBtn, opacity: busy === 'create' ? 0.5 : 1 }}>
                {busy === 'create' ? 'יוצר…' : 'הוסף לצוות'}
              </button>
              <button onClick={() => { setAdding(false); setNewDraft(EMPTY); setNewPhoto(null) }} style={ghostBtn}>ביטול</button>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-heebo)', paddingTop: 40 }}>טוען…</p>
        ) : agents.length === 0 && !adding ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-heebo)', paddingTop: 40 }}>
            עדיין אין אנשי צוות. לחצו על &quot;הוסף&quot; או &quot;ייבוא מקובץ&quot; כדי להתחיל.
          </p>
        ) : agents.map((a, i) => {
          const isEditing = editing === a.id
          return (
            <div key={a.id} style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden',
              border: `1px solid ${isEditing ? 'rgba(200,169,110,0.35)' : GOLD_BORDER}`,
              opacity: a.active ? 1 : 0.55,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
                <Avatar agent={a} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 15, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.full_name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-heebo)', fontSize: 12, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.title || '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-heebo)', fontSize: 11, color: a.active ? 'rgba(100,200,120,0.85)' : 'rgba(255,120,120,0.8)' }}>
                      {a.active ? 'פעיל' : 'מושבת'}
                    </span>
                    <a href={`/team/${a.public_id}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: GOLD_DIM, textDecoration: 'none', direction: 'ltr' }}>
                      /team/{a.public_id} ↗
                    </a>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button aria-label="הזז למעלה" disabled={i === 0 || busy === 'move'} onClick={() => move(i, -1)} style={{ ...iconBtn, height: 22, opacity: i === 0 ? 0.3 : 1 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </button>
                  <button aria-label="הזז למטה" disabled={i === agents.length - 1 || busy === 'move'} onClick={() => move(i, 1)} style={{ ...iconBtn, height: 22, opacity: i === agents.length - 1 ? 0.3 : 1 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </button>
                </div>
                <button aria-label="עריכה" onClick={() => { if (isEditing) { setEditing(null); return } setEditing(a.id); setDraft(draftFrom(a)); setError(null) }}
                  style={{ ...iconBtn, width: 34, height: 34, color: isEditing ? GOLD : 'rgba(255,255,255,0.45)', borderColor: isEditing ? 'rgba(200,169,110,0.4)' : 'rgba(255,255,255,0.1)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {isEditing && (
                <div style={{ padding: '12px', borderTop: `1px solid ${GOLD_BORDER}`, display: 'grid', gap: 12 }}>
                  <Fields draft={draft} setDraft={setDraft} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <PhotoPicker busy={busy === 'photo:' + a.id} label={a.photo_url ? 'החלף תמונה' : 'העלה תמונה'}
                      onPick={f => run('photo:' + a.id, async () => replace(await uploadPhoto(a.id, f)))} />
                    {a.photo_url && (
                      <button style={ghostBtn} disabled={!!busy}
                        onClick={() => run('photo:' + a.id, async () => {
                          replace((await api<{ agent: Agent }>(`/api/admin/agents/${a.id}/photo`, { method: 'DELETE' })).agent)
                        })}>
                        הסר תמונה
                      </button>
                    )}
                    <button style={{ ...ghostBtn, color: a.active ? 'rgba(255,120,120,0.85)' : 'rgba(100,200,120,0.9)' }}
                      disabled={!!busy} onClick={() => toggleActive(a)}>
                      {a.active ? 'השבת' : 'הפעל מחדש'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => save(a)} disabled={busy === 'save:' + a.id} style={{ ...primaryBtn, opacity: busy === 'save:' + a.id ? 0.5 : 1 }}>
                      {busy === 'save:' + a.id ? 'שומר…' : 'שמור'}
                    </button>
                    <button onClick={() => setEditing(null)} style={ghostBtn}>ביטול</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
