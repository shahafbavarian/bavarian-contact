'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const PHONE_NUMBER = 'PHONE_PLACEHOLDER'
const WHATSAPP_NUMBER = '99561906'

const PRESET_MESSAGES = [
  'היי, אשמח לדבר עם נציג מכירות!',
  'היי, אני מתעניין ברכב מסוים, תחזרו אליי בבקשה!',
]

function ContactForm() {
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ name: '', phone: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [utmSource, setUtmSource] = useState('')
  const [utmCampaign, setUtmCampaign] = useState('')

  useEffect(() => {
    setUtmSource(searchParams.get('utm_source') ?? '')
    setUtmCampaign(searchParams.get('utm_campaign') ?? '')
  }, [searchParams])

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, utm_source: utmSource, utm_campaign: utmCampaign }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      setForm({ name: '', phone: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-12">
        <div className="flex justify-center mb-6">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="23" stroke="#C8A96E" strokeWidth="1.5" />
            <path d="M14 24l8 8 12-16" stroke="#C8A96E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="font-cormorant text-2xl text-[--gold] mb-2">תודה על פנייתך</p>
        <p className="font-montserrat text-sm text-[--text-muted]">נציג יחזור אליך בהקדם</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label className="block font-montserrat text-xs text-[--text-muted] mb-2 tracking-widest uppercase">
          שם מלא <span className="text-[--gold]">*</span>
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={e => setField('name', e.target.value)}
          placeholder="הכנס את שמך"
          className="w-full bg-transparent border border-[--border] rounded-none px-4 py-3 font-montserrat text-sm text-[--text] placeholder-[--text-muted] focus:outline-none focus:border-[--gold] transition-colors duration-300"
        />
      </div>

      <div>
        <label className="block font-montserrat text-xs text-[--text-muted] mb-2 tracking-widest uppercase">
          מספר טלפון <span className="text-[--gold]">*</span>
        </label>
        <input
          type="tel"
          required
          value={form.phone}
          onChange={e => setField('phone', e.target.value)}
          placeholder="050-000-0000"
          dir="ltr"
          className="w-full bg-transparent border border-[--border] rounded-none px-4 py-3 font-montserrat text-sm text-[--text] placeholder-[--text-muted] focus:outline-none focus:border-[--gold] transition-colors duration-300 text-right"
        />
      </div>

      <div>
        <label className="block font-montserrat text-xs text-[--text-muted] mb-3 tracking-widest uppercase">
          הודעה
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_MESSAGES.map(msg => (
            <button
              key={msg}
              type="button"
              onClick={() => setField('message', msg)}
              className={`text-xs font-montserrat px-3 py-1.5 border transition-all duration-200 text-right ${
                form.message === msg
                  ? 'border-[--gold] text-[--gold] bg-[rgba(200,169,110,0.08)]'
                  : 'border-[--border] text-[--text-muted] hover:border-[--gold] hover:text-[--gold]'
              }`}
            >
              {msg}
            </button>
          ))}
        </div>
        <textarea
          value={form.message}
          onChange={e => setField('message', e.target.value)}
          placeholder="או כתוב הודעה חופשית..."
          rows={3}
          className="w-full bg-transparent border border-[--border] rounded-none px-4 py-3 font-montserrat text-sm text-[--text] placeholder-[--text-muted] focus:outline-none focus:border-[--gold] transition-colors duration-300 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full border border-[--gold] text-[--gold] font-montserrat text-xs tracking-widest uppercase py-4 hover:bg-[rgba(200,169,110,0.08)] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3"
      >
        {status === 'loading' ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 10" />
            </svg>
            שולח...
          </>
        ) : (
          <>
            שלח פנייה
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M12 7H2M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>

      {status === 'error' && (
        <p className="text-center text-xs font-montserrat text-red-400">
          אירעה שגיאה. אנא נסה שוב או צור קשר ישירות.
        </p>
      )}
    </form>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[--bg]">

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-24 overflow-hidden">

        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#C8A96E 1px, transparent 1px), linear-gradient(to right, #C8A96E 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Corner accents */}
        <div className="absolute top-8 right-8 w-12 h-12 border-t border-r border-[--gold] opacity-40" />
        <div className="absolute top-8 left-8 w-12 h-12 border-t border-l border-[--gold] opacity-40" />
        <div className="absolute bottom-8 right-8 w-12 h-12 border-b border-r border-[--gold] opacity-40" />
        <div className="absolute bottom-8 left-8 w-12 h-12 border-b border-l border-[--gold] opacity-40" />

        <div className="relative z-10 text-center max-w-2xl mx-auto">

          {/* Logo mark */}
          <div className="flex justify-center mb-8">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="25" stroke="#C8A96E" strokeWidth="0.8" />
              <circle cx="26" cy="26" r="19" stroke="#C8A96E" strokeWidth="0.4" opacity="0.5" />
              <path d="M26 10 L30 20 L26 18 L22 20 Z" fill="#C8A96E" opacity="0.9" />
              <path d="M14 32 L26 18 L38 32" stroke="#C8A96E" strokeWidth="1" fill="none" strokeLinejoin="round" />
              <path d="M18 32 L34 32" stroke="#C8A96E" strokeWidth="0.8" />
            </svg>
          </div>

          {/* Brand */}
          <p className="font-montserrat text-[10px] tracking-[0.4em] text-[--gold] uppercase mb-3">
            Bavarian Motors Club
          </p>

          <div className="gold-line mb-8 mx-auto max-w-xs" />

          {/* Headline */}
          <h1 className="font-cormorant font-light text-5xl md:text-6xl text-[--text] leading-tight mb-4">
            רכבי יוקרה
            <br />
            <span className="text-[--gold]">ברמה אחרת</span>
          </h1>

          <p className="font-montserrat font-light text-sm text-[--text-muted] leading-relaxed mb-12 max-w-sm mx-auto">
            יבואן רכבי יוקרה מהשורה הראשונה.
            <br />
            צרו קשר ונמצא את הרכב המושלם עבורכם.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">

            <a
              href={`https://wa.me/972${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-[rgba(200,169,110,0.08)] border border-[--gold] text-[--gold] font-montserrat text-xs tracking-widest uppercase px-8 py-4 hover:bg-[rgba(200,169,110,0.16)] transition-all duration-300 group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor" />
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.979-1.418A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              WhatsApp
            </a>

            <a
              href={`tel:+972${PHONE_NUMBER}`}
              className="flex items-center justify-center gap-3 bg-transparent border border-[--border] text-[--text] font-montserrat text-xs tracking-widest uppercase px-8 py-4 hover:border-[--gold] hover:text-[--gold] transition-all duration-300"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              התקשר אלינו
            </a>

          </div>

          {/* Scroll indicator */}
          <a href="#contact" className="flex flex-col items-center gap-2 text-[--text-muted] hover:text-[--gold] transition-colors duration-300 group">
            <span className="font-montserrat text-[10px] tracking-widest uppercase">השאר פרטים</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="animate-bounce">
              <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>

        </div>
      </section>

      {/* ─── Contact Form ─── */}
      <section id="contact" className="py-24 px-6 bg-[--surface]">
        <div className="max-w-lg mx-auto">

          <div className="text-center mb-12">
            <p className="font-montserrat text-[10px] tracking-[0.4em] text-[--gold] uppercase mb-4">
              צור קשר
            </p>
            <h2 className="font-cormorant font-light text-4xl text-[--text] mb-4">
              השאר פרטים
            </h2>
            <div className="gold-line max-w-[120px] mx-auto" />
          </div>

          <div className="border border-[--border] p-8 md:p-10">
            <Suspense fallback={<div className="h-64" />}>
              <ContactForm />
            </Suspense>
          </div>

        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-8 px-6 border-t border-[--border]">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-3">
          <p className="font-montserrat text-[10px] tracking-[0.3em] text-[--text-muted] uppercase">
            Bavarian Motors Club
          </p>
          <div className="gold-line-solid w-16" />
          <p className="font-montserrat text-[10px] text-[--text-muted] opacity-40">
            &copy; {new Date().getFullYear()} כל הזכויות שמורות
          </p>
        </div>
      </footer>

    </main>
  )
}
