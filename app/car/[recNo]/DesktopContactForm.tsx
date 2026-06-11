'use client'

import { useState, useRef } from 'react'

const WHATSAPP_NUMBER = '97299561906'
const PHONE_NUMBER = '099561906'
const PRESET_MESSAGES = [
  'היי, אשמח לדבר עם נציג מכירות!',
  'היי, אני מתעניין ברכב מסוים, תחזרו אליי בבקשה!',
]
const GOLD = 'rgba(200,169,110,0.9)'

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  padding: '10px 14px',
  fontFamily: 'var(--font-inter)', fontSize: 13,
  color: '#fff', borderRadius: 10, outline: 'none',
  direction: 'rtl', transition: 'border-color 0.2s',
}

function validatePhone(v: string): string {
  const d = v.replace(/\D/g, '')
  if (!d) return 'נדרש למלא מספר טלפון'
  if (!/^05\d{8}$/.test(d)) return 'מספר טלפון לא תקין'
  return ''
}

export default function DesktopContactForm({ carName, recNo }: { carName: string; recNo: string }) {
  const [form, setForm] = useState({ name: '', phone: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [phoneError, setPhoneError] = useState('')
  const honeypotRef = useRef<HTMLInputElement>(null)

  function setField(f: string, v: string) {
    setForm(p => ({ ...p, [f]: v }))
    if (f === 'phone') setPhoneError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validatePhone(form.phone)
    if (err) { setPhoneError(err); return }
    setStatus('loading')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          name: form.name.trim() || 'ללא שם',
          utm_source: carName,
          utm_campaign: `https://bavarian-motors.co.il/He/Car?recNo=${recNo}`,
          device: 'desktop',
          website: honeypotRef.current?.value || '',
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch { setStatus('error') }
  }

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '28px 0', direction: 'rtl' }}>
        <svg style={{ margin: '0 auto 14px', display: 'block' }} width="44" height="44" viewBox="0 0 52 52" fill="none">
          <circle cx="26" cy="26" r="24" stroke="white" strokeWidth="1" opacity="0.3" />
          <path d="M15 26l9 9 13-16" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p style={{ fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 17, color: '#fff', marginBottom: 4 }}>הפרטים נשלחו!</p>
        <p style={{ fontFamily: 'var(--font-heebo)', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>ניצור קשר בהקדם</p>
      </div>
    )
  }

  return (
    <div style={{ direction: 'rtl' }}>
      <p style={{ fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 15, color: '#fff', margin: '0 0 2px' }}>השאירו פרטים</p>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>ונציג יחזור אליכם בהקדם</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }} noValidate>
        <input ref={honeypotRef} type="text" name="website" tabIndex={-1} aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} />

        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-inter)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 5 }}>
            טלפון <span style={{ color: 'rgba(255,255,255,0.5)' }}>*</span>
          </label>
          <input type="tel" value={form.phone}
            onChange={e => setField('phone', e.target.value)}
            onBlur={() => { if (form.phone) setPhoneError(validatePhone(form.phone)) }}
            placeholder="050-000-0000" maxLength={12}
            style={{ ...inputStyle, borderColor: phoneError ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.1)' }}
          />
          {phoneError && <p style={{ marginTop: 4, fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(248,113,113,0.9)' }}>{phoneError}</p>}
        </div>

        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-inter)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 5 }}>שם מלא</label>
          <input type="text" value={form.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="הכנס את שמך"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-inter)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>הודעה</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 7 }}>
            {PRESET_MESSAGES.map(msg => (
              <button key={msg} type="button" onClick={() => setField('message', msg)} style={{
                fontFamily: 'var(--font-inter)', fontSize: 11, padding: '5px 11px', borderRadius: 20,
                border: `1px solid ${form.message === msg ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                background: form.message === msg ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: form.message === msg ? '#fff' : 'rgba(255,255,255,0.35)',
                cursor: 'pointer', direction: 'rtl', transition: 'all 0.15s',
              }}>{msg}</button>
            ))}
          </div>
          <textarea value={form.message} onChange={e => setField('message', e.target.value)}
            placeholder="הודעה חופשית..." rows={2}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>

        <button type="submit" disabled={status === 'loading'} style={{
          width: '100%', background: GOLD, color: '#000',
          fontFamily: 'var(--font-heebo)', fontWeight: 700, fontSize: 13,
          padding: '12px', borderRadius: 10, border: 'none',
          cursor: 'pointer', marginTop: 2, transition: 'opacity 0.2s',
          opacity: status === 'loading' ? 0.5 : 1,
        }}>
          {status === 'loading' ? 'שולח...' : 'שלח פנייה'}
        </button>
        {status === 'error' && <p style={{ textAlign: 'center', fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(248,113,113,0.9)' }}>אירעה שגיאה. נסה שוב.</p>}
      </form>

    </div>
  )
}
