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

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '10px 0', borderRadius: 10,
          background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.2)',
          color: '#25D366', textDecoration: 'none', fontFamily: 'var(--font-inter)', fontSize: 12,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/>
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.979-1.418A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
          WhatsApp
        </a>
        <a href={`tel:+972${PHONE_NUMBER}`} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '10px 0', borderRadius: 10,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontFamily: 'var(--font-inter)', fontSize: 12,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          09-956-1906
        </a>
      </div>
    </div>
  )
}
