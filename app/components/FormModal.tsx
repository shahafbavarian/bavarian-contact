'use client'

import { useState, useRef } from 'react'

const WHATSAPP_NUMBER = '97299561906'
const PHONE_NUMBER = '099561906'

const PRESET_MESSAGES = [
  'היי, אשמח לדבר עם נציג מכירות!',
  'היי, אני מתעניין ברכב מסוים, תחזרו אליי בבקשה!',
]

function getDevice(): 'mobile' | 'desktop' {
  return window.innerWidth < 1024 ? 'mobile' : 'desktop'
}

export default function FormModal({
  onClose,
  utmSource,
  utmCampaign,
}: {
  onClose: () => void
  utmSource: string
  utmCampaign: string
}) {
  const [form, setForm] = useState({ name: '', phone: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [phoneError, setPhoneError] = useState('')
  const honeypotRef = useRef<HTMLInputElement>(null)

  function setField(f: string, v: string) {
    setForm(p => ({ ...p, [f]: v }))
    if (f === 'phone') setPhoneError('')
  }

  function validatePhone(value: string): string {
    const digits = value.replace(/\D/g, '')
    if (!digits) return 'נדרש למלא מספר טלפון'
    if (!/^05\d{8}$/.test(digits)) return 'מספר טלפון לא תקין'
    return ''
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
          utm_source: utmSource,
          utm_campaign: utmCampaign,
          device: getDevice(),
          website: honeypotRef.current?.value || '',
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full bg-[#0e0e0e] border border-white/10 rounded-2xl px-6 pb-8 pt-5"
        style={{ maxHeight: '90vh', overflowY: 'auto', direction: 'rtl' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-heebo font-bold text-xl text-white">השאירו פרטים</h2>
            <p className="font-inter text-xs text-white/40 mt-0.5">ונציג יחזור אליכם בהקדם</p>
          </div>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white/80 transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {status === 'success' ? (
          <div className="text-center py-6">
            <svg className="mx-auto mb-4" width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="24" stroke="white" strokeWidth="1" opacity="0.3" />
              <path d="M15 26l9 9 13-16" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="font-heebo font-bold text-xl text-white mb-1">הפרטים נשלחו!</p>
            <p className="font-heebo text-base text-white/60 mb-8">ניצור קשר בהקדם</p>
            <div className="border-t border-white/10 pt-6">
              <p className="font-inter text-[10px] tracking-widest text-white/30 uppercase mb-4">גלה עוד</p>
              <div className="flex flex-col gap-3">
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 py-3 rounded-xl font-heebo text-sm text-white border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                  WhatsApp
                </a>
                <a href={`tel:+972${PHONE_NUMBER}`}
                  className="flex items-center justify-center gap-2.5 py-3 rounded-xl font-heebo text-sm text-white border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                  {PHONE_NUMBER}
                </a>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <input ref={honeypotRef} type="text" name="website" tabIndex={-1} aria-hidden="true"
              autoComplete="off" style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} />
            <div>
              <label className="block font-inter text-[10px] tracking-widest text-white/30 uppercase mb-2">
                טלפון <span className="text-white/60">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setField('phone', e.target.value)}
                onBlur={() => { if (form.phone) setPhoneError(validatePhone(form.phone)) }}
                placeholder="050-000-0000"
                maxLength={12}
                className={`w-full bg-white/5 border px-4 py-3.5 font-inter text-sm text-white placeholder-white/20 focus:outline-none transition-colors rounded-xl text-right ${phoneError ? 'border-red-500/60 focus:border-red-500/80' : 'border-white/10 focus:border-white/30'}`}
              />
              {phoneError && <p className="mt-1.5 font-inter text-xs text-red-400">{phoneError}</p>}
            </div>
            <div>
              <label className="block font-inter text-[10px] tracking-widest text-white/30 uppercase mb-2">שם מלא</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="הכנס את שמך"
                className="w-full bg-white/5 border border-white/10 px-4 py-3.5 font-inter text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors rounded-xl"
              />
            </div>
            <div>
              <label className="block font-inter text-[10px] tracking-widest text-white/30 uppercase mb-3">הודעה</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_MESSAGES.map(msg => (
                  <button key={msg} type="button" onClick={() => setField('message', msg)}
                    className={`text-xs font-inter px-3.5 py-2 rounded-full border transition-all text-right ${form.message === msg ? 'border-white/50 text-white bg-white/10' : 'border-white/10 text-white/40 hover:border-white/30'}`}>
                    {msg}
                  </button>
                ))}
              </div>
              <textarea
                value={form.message}
                onChange={e => setField('message', e.target.value)}
                placeholder="הודעה חופשית..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 px-4 py-3.5 font-inter text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors resize-none rounded-xl"
              />
            </div>
            <button type="submit" disabled={status === 'loading'}
              className="w-full bg-white text-black font-heebo font-bold text-sm py-4 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40 mt-1">
              {status === 'loading' ? 'שולח...' : 'שלח פנייה'}
            </button>
            {status === 'error' && <p className="text-center text-xs text-red-400 font-inter">אירעה שגיאה. נסה שוב.</p>}
          </form>
        )}
      </div>
    </div>
  )
}
