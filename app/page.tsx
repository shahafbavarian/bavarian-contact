'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const WHATSAPP_NUMBER = '97299561906'
const PHONE_NUMBER = 'PHONE_PLACEHOLDER'

const BACKGROUNDS = ['/BG1.PNG', '/BG2.PNG', '/BG3.PNG', '/BG4.PNG']

const PRESET_MESSAGES = [
  'היי, אשמח לדבר עם נציג מכירות!',
  'היי, אני מתעניין ברכב מסוים, תחזרו אליי בבקשה!',
]

function FormModal({ onClose, utmSource, utmCampaign }: {
  onClose: () => void
  utmSource: string
  utmCampaign: string
}) {
  const [form, setForm] = useState({ name: '', phone: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  function setField(f: string, v: string) {
    setForm(p => ({ ...p, [f]: v }))
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
    } catch {
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full bg-[#0e0e0e] border-t border-white/10 px-6 pb-10 pt-5"
        style={{ maxHeight: '88vh', overflowY: 'auto', direction: 'rtl' }}
      >
        {/* Handle */}
        <div className="flex items-center justify-center mb-6 relative">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
          <button onClick={onClose} className="absolute left-0 p-1 text-white/40 hover:text-white/80 transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {status === 'success' ? (
          <div className="text-center py-10">
            <svg className="mx-auto mb-4" width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="24" stroke="white" strokeWidth="1" opacity="0.3" />
              <path d="M15 26l9 9 13-16" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="font-heebo font-bold text-xl text-white mb-1">תודה!</p>
            <p className="font-inter text-sm text-white/40">נציג יחזור אליך בהקדם</p>
          </div>
        ) : (
          <>
            <h2 className="font-heebo font-bold text-xl text-white mb-1">השאירו פרטים</h2>
            <p className="font-inter text-sm text-white/40 mb-6">ונציג יחזור אליכם בהקדם</p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block font-inter text-[10px] tracking-widest text-white/30 uppercase mb-2">
                  שם מלא <span className="text-white/60">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="הכנס את שמך"
                  className="w-full bg-white/5 border border-white/10 px-4 py-3.5 font-inter text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors rounded-xl"
                />
              </div>

              <div>
                <label className="block font-inter text-[10px] tracking-widest text-white/30 uppercase mb-2">
                  טלפון <span className="text-white/60">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  placeholder="050-000-0000"
                  className="w-full bg-white/5 border border-white/10 px-4 py-3.5 font-inter text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors rounded-xl text-right"
                />
              </div>

              <div>
                <label className="block font-inter text-[10px] tracking-widest text-white/30 uppercase mb-3">
                  הודעה
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_MESSAGES.map(msg => (
                    <button
                      key={msg}
                      type="button"
                      onClick={() => setField('message', msg)}
                      className={`text-xs font-inter px-3.5 py-2 rounded-full border transition-all text-right ${
                        form.message === msg
                          ? 'border-white/50 text-white bg-white/10'
                          : 'border-white/10 text-white/40 hover:border-white/30'
                      }`}
                    >
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

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-white text-black font-heebo font-bold text-sm py-4 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40 mt-1"
              >
                {status === 'loading' ? 'שולח...' : 'שלח פנייה'}
              </button>

              {status === 'error' && (
                <p className="text-center text-xs text-red-400 font-inter">אירעה שגיאה. נסה שוב.</p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function PageContent() {
  const searchParams = useSearchParams()
  const [showModal, setShowModal] = useState(false)
  const [utmSource, setUtmSource] = useState('')
  const [utmCampaign, setUtmCampaign] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [nextIndex, setNextIndex] = useState<number | null>(null)

  useEffect(() => {
    setUtmSource(searchParams.get('utm_source') ?? '')
    setUtmCampaign(searchParams.get('utm_campaign') ?? '')
  }, [searchParams])

  function goToBg(dir: 1 | -1) {
    if (nextIndex !== null) return
    const next = (currentIndex + dir + BACKGROUNDS.length) % BACKGROUNDS.length
    setNextIndex(next)
    setTimeout(() => {
      setCurrentIndex(next)
      setNextIndex(null)
    }, 600)
  }

  function jumpToBg(i: number) {
    if (nextIndex !== null || i === currentIndex) return
    setNextIndex(i)
    setTimeout(() => {
      setCurrentIndex(i)
      setNextIndex(null)
    }, 600)
  }

  function getBgOpacity(i: number) {
    if (nextIndex === null) return i === currentIndex ? 1 : 0
    if (i === nextIndex) return 1
    if (i === currentIndex) return 0
    return 0
  }

  return (
    <main
      dir="rtl"
      style={{
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        background: '#000',
      }}
    >
      {/* ─── Background Images (fade) ─── */}
      {BACKGROUNDS.map((src, i) => (
        <div
          key={src}
          style={{
            position: 'absolute',
            top: '-12%',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            opacity: getBgOpacity(i),
            transition: 'opacity 0.6s ease-in-out',
          }}
        />
      ))}

      {/* ─── Side Arrows ─── */}
      <button
        onClick={() => goToBg(-1)}
        style={{
          position: 'absolute',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          cursor: 'pointer',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        onClick={() => goToBg(1)}
        style={{
          position: 'absolute',
          right: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          cursor: 'pointer',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* ─── Gradient Overlay ─── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 52%, rgba(0,0,0,0.6) 62%, #000 72%)',
        }}
      />

      {/* ─── Bottom Content ─── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0 20px 64px',
        }}
      >
        {/* Dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {BACKGROUNDS.map((_, i) => (
            <button
              key={i}
              onClick={() => jumpToBg(i)}
              style={{
                width: i === currentIndex ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === currentIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>

        {/* Headlines */}
        <div className="mb-5">
          <h1 className="font-heebo font-black text-[22px] text-white leading-tight">
            מלאי נרחב של רכבי יוקרה וספורט
            <br />
            מחכה לכם בבוואריאן מוטורס!
          </h1>
          <p className="font-heebo font-light text-[22px] text-white/50 leading-tight mt-0.5">
            בואו להנות מאבזור עשיר, שירות אישי
            <br />
            ומהיר ויתרון במחיר!
          </p>
        </div>

        {/* ─── 3 Buttons ─── */}
        <div className="grid grid-cols-3 gap-2.5">

          {/* WhatsApp */}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl font-inter text-[12px] font-medium text-black transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.92)' }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor" />
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.979-1.418A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
            WhatsApp
          </a>

          {/* Phone */}
          <a
            href={`tel:+972${PHONE_NUMBER}`}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl font-inter text-[12px] text-white transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            שיחה עם נציג
          </a>

          {/* Form */}
          <button
            onClick={() => setShowModal(true)}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl font-inter text-[12px] text-white transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            השאירו פרטים
          </button>

        </div>
      </div>

      {/* ─── Form Modal ─── */}
      {showModal && (
        <FormModal
          onClose={() => setShowModal(false)}
          utmSource={utmSource}
          utmCampaign={utmCampaign}
        />
      )}

    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ height: '100vh', background: '#000' }} />}>
      <PageContent />
    </Suspense>
  )
}
