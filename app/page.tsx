'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

const WHATSAPP_NUMBER = '97299561906'
const PHONE_NUMBER = 'PHONE_PLACEHOLDER'

const CAR_MODELS = [
  {
    name: 'BMW M5',
    tagline: 'The Ultimate Driving Machine',
    description: 'הסדאן הספורטיבי האולטימטיבי — כוח, דיוק ואלגנציה.',
    image: null as string | null,
  },
  {
    name: 'BMW X7',
    tagline: 'Luxury Redefined',
    description: 'ה-SUV היוקרתי — מרחב, טכנולוגיה ונוכחות מלכותית.',
    image: null as string | null,
  },
  {
    name: 'BMW 7 Series',
    tagline: 'The Art of Driving',
    description: 'הליימוזינה הדגל — פינוק ללא גבול, ביצועים ללא פשרות.',
    image: null as string | null,
  },
]

const PRESET_MESSAGES = [
  'היי, אשמח לדבר עם נציג מכירות!',
  'היי, אני מתעניין ברכב מסוים, תחזרו אליי בבקשה!',
]

function CarSilhouette() {
  return (
    <svg viewBox="0 0 360 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <path
        d="M30 112 L48 84 Q70 58 116 52 L165 47 Q202 44 242 49 L288 56 Q326 67 344 90 L354 112 Q342 120 318 120 L42 120 Q28 120 30 112Z"
        fill="rgba(255,255,255,0.07)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />
      <path
        d="M120 52 L142 28 Q178 16 212 18 L248 24 L272 52"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
        fill="rgba(255,255,255,0.04)"
      />
      <circle cx="108" cy="120" r="26" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
      <circle cx="108" cy="120" r="10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <circle cx="282" cy="120" r="26" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
      <circle cx="282" cy="120" r="10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <path d="M168 52 L170 120" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <path d="M342 94 L356 104 L348 114" fill="rgba(255,255,255,0.08)" />
      <path d="M32 96 L16 106 L24 116" fill="rgba(255,255,255,0.06)" />
    </svg>
  )
}

function FormModal({ onClose, utmSource, utmCampaign }: {
  onClose: () => void
  utmSource: string
  utmCampaign: string
}) {
  const [form, setForm] = useState({ name: '', phone: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

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
    } catch {
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full bg-white rounded-t-2xl px-6 pb-10 pt-4"
        style={{ maxHeight: '88vh', overflowY: 'auto', direction: 'rtl' }}
      >
        <div className="relative flex items-center justify-center mb-5">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
          <button onClick={onClose} className="absolute left-0 p-1">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {status === 'success' ? (
          <div className="text-center py-10">
            <svg className="mx-auto mb-4" width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="24" stroke="#111" strokeWidth="1.5" />
              <path d="M15 26l9 9 13-16" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="font-heebo text-2xl text-gray-900 mb-1">תודה!</p>
            <p className="font-inter text-sm text-gray-400">נציג יחזור אליך בהקדם האפשרי</p>
          </div>
        ) : (
          <>
            <h2 className="font-heebo font-bold text-2xl text-gray-900 mb-1">השאירו פרטים</h2>
            <p className="font-inter text-sm text-gray-400 mb-6">ונציג יחזור אליכם בהקדם</p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block font-inter text-[11px] text-gray-400 mb-1.5 tracking-widest uppercase">
                  שם מלא <span className="text-gray-800">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="הכנס את שמך"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3.5 font-inter text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-500 transition-colors"
                />
              </div>

              <div>
                <label className="block font-inter text-[11px] text-gray-400 mb-1.5 tracking-widest uppercase">
                  טלפון <span className="text-gray-800">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  placeholder="050-000-0000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3.5 font-inter text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-500 transition-colors text-right"
                />
              </div>

              <div>
                <label className="block font-inter text-[11px] text-gray-400 mb-2.5 tracking-widest uppercase">
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
                          ? 'border-gray-800 text-gray-900 bg-gray-50'
                          : 'border-gray-200 text-gray-400 hover:border-gray-400'
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
                  className="w-full border border-gray-200 rounded-xl px-4 py-3.5 font-inter text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-black text-white font-inter text-sm font-medium tracking-wide py-4 rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-40 mt-1"
              >
                {status === 'loading' ? 'שולח...' : 'שלח פנייה'}
              </button>

              {status === 'error' && (
                <p className="text-center text-xs text-red-500 font-inter">אירעה שגיאה. נסה שוב.</p>
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
  const [currentCar, setCurrentCar] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [utmSource, setUtmSource] = useState('')
  const [utmCampaign, setUtmCampaign] = useState('')
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    setUtmSource(searchParams.get('utm_source') ?? '')
    setUtmCampaign(searchParams.get('utm_campaign') ?? '')
  }, [searchParams])

  function goTo(dir: 1 | -1) {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setCurrentCar(i => (i + dir + CAR_MODELS.length) % CAR_MODELS.length)
      setAnimating(false)
    }, 200)
  }

  function jumpTo(i: number) {
    if (animating || i === currentCar) return
    setAnimating(true)
    setTimeout(() => { setCurrentCar(i); setAnimating(false) }, 200)
  }

  const car = CAR_MODELS[currentCar]

  return (
    <main
      className="bg-black text-white flex flex-col select-none"
      style={{ height: '100dvh', overflow: 'hidden' }}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchStartX.current === null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(dx) > 45) goTo(dx > 0 ? 1 : -1)
        touchStartX.current = null
      }}
    >

      {/* ─── Header: Logo + Text ─── */}
      <div className="flex flex-col items-center text-center px-6 pt-10 flex-shrink-0">
        <div className="relative w-[72px] h-[72px] mb-5">
          <Image
            src="/logo.png"
            alt="Bavarian Motors Club"
            fill
            className="object-contain"
            priority
            onError={() => {}}
          />
        </div>

        <h1 className="font-heebo font-bold text-[22px] leading-snug text-white max-w-[280px]">
          מלאי נרחב של רכבי יוקרה וספורט
          <br />
          מחכה לכם בבוואריאן מוטורס!
        </h1>

        <p className="font-inter text-[13px] text-white/45 mt-2.5 leading-relaxed max-w-[260px]">
          בואו להנות מאבזור עשיר, שירות אישי ומהיר
          <br />
          ויתרון במחיר!
        </p>
      </div>

      {/* ─── Carousel ─── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-8 relative"
        style={{ transition: 'opacity 0.2s', opacity: animating ? 0 : 1 }}
      >
        {/* Visual */}
        <div className="w-full max-w-[320px]">
          {car.image ? (
            <div className="relative w-full h-44">
              <Image src={car.image} alt={car.name} fill className="object-contain" />
            </div>
          ) : (
            <div className="w-full py-2">
              <CarSilhouette />
            </div>
          )}
        </div>

        {/* Model info */}
        <div className="text-center mt-3">
          <p className="font-inter text-[10px] tracking-[0.35em] text-white/25 uppercase mb-1">
            {car.tagline}
          </p>
          <h2 className="font-heebo font-bold text-3xl text-white tracking-wide">
            {car.name}
          </h2>
          <p className="font-inter text-[13px] text-white/35 mt-1.5 max-w-[240px] mx-auto leading-relaxed">
            {car.description}
          </p>
        </div>

        {/* Dots */}
        <div className="flex gap-2 mt-5">
          {CAR_MODELS.map((_, i) => (
            <button
              key={i}
              onClick={() => jumpTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentCar ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Arrow buttons */}
        <button
          onClick={() => goTo(1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-white/20 hover:text-white/50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => goTo(-1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-white/20 hover:text-white/50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ─── Buttons ─── */}
      <div className="flex-shrink-0 px-5 pb-9 pt-3 flex flex-col gap-3">
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 bg-white text-black font-inter text-[15px] font-medium py-[15px] rounded-2xl active:scale-[0.98] transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor" />
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.979-1.418A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          WhatsApp
        </a>

        <div className="grid grid-cols-2 gap-3">
          <a
            href={`tel:+972${PHONE_NUMBER}`}
            className="flex items-center justify-center gap-2 border border-white/15 text-white font-inter text-[14px] py-[14px] rounded-2xl hover:border-white/30 active:scale-[0.98] transition-all"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            שיחה עם נציג
          </a>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 border border-white/15 text-white font-inter text-[14px] py-[14px] rounded-2xl hover:border-white/30 active:scale-[0.98] transition-all"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
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
    <Suspense fallback={<div className="bg-black" style={{ height: '100dvh' }} />}>
      <PageContent />
    </Suspense>
  )
}
