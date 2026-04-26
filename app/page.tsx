'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

const WHATSAPP_NUMBER = '97299561906'
const PHONE_NUMBER = 'PHONE_PLACEHOLDER'

const CAR_MODELS = [
  {
    name: 'BMW M5',
    description: 'הסדאן הספורטיבי האולטימטיבי — כוח, דיוק ואלגנציה בלתי מתפשרת.',
    image: null,
  },
  {
    name: 'BMW X7',
    description: 'ה-SUV היוקרתי בסגמנט הפרמיום — מרחב, טכנולוגיה ונוכחות כביש מלכותית.',
    image: null,
  },
  {
    name: 'BMW 7 Series',
    description: 'הליימוזינה הדגל של BMW — פינוק ללא גבול, ביצועים ללא פשרות.',
    image: null,
  },
]

const PRESET_MESSAGES = [
  'היי, אשמח לדבר עם נציג מכירות!',
  'היי, אני מתעניין ברכב מסוים, תחזרו אליי בבקשה!',
]

function Carousel() {
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)
  const total = CAR_MODELS.length

  function go(dir: 1 | -1) {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setCurrent(i => (i + dir + total) % total)
      setAnimating(false)
    }, 250)
  }

  const car = CAR_MODELS[current]

  return (
    <div className="relative w-full max-w-2xl mx-auto select-none">
      {/* Car display */}
      <div
        className="relative overflow-hidden rounded-sm"
        style={{ transition: 'opacity 0.25s', opacity: animating ? 0 : 1 }}
      >
        {/* Image area */}
        <div className="relative w-full bg-[#111] flex items-center justify-center"
          style={{ height: '340px' }}>
          {car.image ? (
            <Image src={car.image} alt={car.name} fill className="object-contain p-8" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 opacity-20">
              <svg width="80" height="50" viewBox="0 0 80 50" fill="none">
                <rect x="10" y="20" width="60" height="22" rx="4" stroke="white" strokeWidth="1.5" />
                <path d="M18 20 L26 8 L54 8 L62 20" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="22" cy="42" r="6" stroke="white" strokeWidth="1.5" />
                <circle cx="58" cy="42" r="6" stroke="white" strokeWidth="1.5" />
                <path d="M2 28h6M72 28h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="font-montserrat text-xs text-white tracking-widest">תמונה בקרוב</span>
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="bg-[#161616] border-t border-[#2a2a2a] px-8 py-6 text-center">
          <h3 className="font-cormorant text-3xl font-light text-white mb-2 tracking-wide">
            {car.name}
          </h3>
          <p className="font-montserrat text-sm text-[#888] leading-relaxed max-w-md mx-auto">
            {car.description}
          </p>
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={() => go(-1)}
        aria-label="הקודם"
        className="absolute top-1/2 -translate-y-1/2 right-[-20px] md:right-[-40px] w-10 h-10 flex items-center justify-center border border-[#333] bg-[#0d0d0d] hover:border-white transition-colors duration-200"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 2l5 5-5 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        onClick={() => go(1)}
        aria-label="הבא"
        className="absolute top-1/2 -translate-y-1/2 left-[-20px] md:left-[-40px] w-10 h-10 flex items-center justify-center border border-[#333] bg-[#0d0d0d] hover:border-white transition-colors duration-200"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {CAR_MODELS.map((_, i) => (
          <button
            key={i}
            onClick={() => { if (!animating) { setAnimating(true); setTimeout(() => { setCurrent(i); setAnimating(false) }, 250) } }}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === current ? 'bg-white w-4' : 'bg-[#444]'}`}
          />
        ))}
      </div>
    </div>
  )
}

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
        <svg className="mx-auto mb-5" width="44" height="44" viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="21" stroke="white" strokeWidth="1" opacity="0.4" />
          <path d="M13 22l7 7 11-14" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="font-cormorant text-2xl text-white mb-2">תודה על פנייתך</p>
        <p className="font-montserrat text-sm text-[#888]">נציג יחזור אליך בהקדם האפשרי</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="block font-montserrat text-[10px] tracking-widest text-[#666] uppercase mb-2">
          שם מלא <span className="text-white">*</span>
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={e => setField('name', e.target.value)}
          placeholder="הכנס את שמך"
          className="w-full bg-[#111] border border-[#2a2a2a] px-4 py-3 font-montserrat text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#555] transition-colors"
        />
      </div>

      <div>
        <label className="block font-montserrat text-[10px] tracking-widest text-[#666] uppercase mb-2">
          מספר טלפון <span className="text-white">*</span>
        </label>
        <input
          type="tel"
          required
          value={form.phone}
          onChange={e => setField('phone', e.target.value)}
          placeholder="050-000-0000"
          className="w-full bg-[#111] border border-[#2a2a2a] px-4 py-3 font-montserrat text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#555] transition-colors text-right"
        />
      </div>

      <div>
        <label className="block font-montserrat text-[10px] tracking-widest text-[#666] uppercase mb-3">
          הודעה
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_MESSAGES.map(msg => (
            <button
              key={msg}
              type="button"
              onClick={() => setField('message', msg)}
              className={`text-xs font-montserrat px-3 py-2 border transition-all duration-200 text-right ${
                form.message === msg
                  ? 'border-white text-white bg-white/5'
                  : 'border-[#2a2a2a] text-[#666] hover:border-[#555] hover:text-[#aaa]'
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
          className="w-full bg-[#111] border border-[#2a2a2a] px-4 py-3 font-montserrat text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#555] transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-white text-black font-montserrat text-xs tracking-widest uppercase py-4 hover:bg-[#e5e5e5] transition-colors duration-200 disabled:opacity-40 flex items-center justify-center gap-3"
      >
        {status === 'loading' ? 'שולח...' : 'שלח פנייה'}
      </button>

      {status === 'error' && (
        <p className="text-center text-xs font-montserrat text-red-400">
          אירעה שגיאה. נסה שוב או צור קשר ישירות.
        </p>
      )}
    </form>
  )
}

export default function Home() {
  const formRef = useRef<HTMLElement>(null)

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">

      {/* ─── Hero ─── */}
      <section className="min-h-screen flex flex-col items-center justify-between px-6 pt-14 pb-10">

        {/* Logo */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-24 h-24 relative">
            <Image
              src="/logo.png"
              alt="Bavarian Motors Club"
              fill
              className="object-contain"
              priority
              onError={() => {}}
            />
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-[#333]" />

          {/* Headlines */}
          <div className="text-center max-w-xl">
            <h1 className="font-cormorant font-light text-3xl md:text-4xl text-white leading-snug mb-4">
              מלאי נחרב של רכבי יוקרה וספורט
              <br />
              <span className="text-[#bbb]">מחכה לכם בבוואריאן מוטורס</span>
            </h1>
            <p className="font-montserrat font-light text-sm text-[#666] leading-relaxed">
              בואו להנות מאבזור עשיר, שירות אישי ומהיר ויתרון במחיר
            </p>
          </div>
        </div>

        {/* Carousel */}
        <div className="w-full py-8">
          <Carousel />
        </div>

        {/* CTA Buttons */}
        <div className="w-full max-w-md flex flex-col gap-3">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 bg-white text-black font-montserrat text-xs tracking-widest uppercase py-4 hover:bg-[#e5e5e5] transition-colors duration-200"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/>
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.979-1.418A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            WhatsApp
          </a>

          <a
            href={`tel:+972${PHONE_NUMBER}`}
            className="flex items-center justify-center gap-3 border border-[#333] text-white font-montserrat text-xs tracking-widest uppercase py-4 hover:border-[#666] transition-colors duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            לשיחה עם נציג
          </a>

          <button
            onClick={scrollToForm}
            className="flex items-center justify-center gap-3 border border-[#222] text-[#777] font-montserrat text-xs tracking-widest uppercase py-4 hover:border-[#444] hover:text-[#aaa] transition-colors duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M7 13l-4-4M7 13l4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            השאירו פרטים
          </button>
        </div>

      </section>

      {/* ─── Contact Form ─── */}
      <section ref={formRef} id="contact" className="py-20 px-6 bg-[#0a0a0a] border-t border-[#1a1a1a]">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-10">
            <p className="font-montserrat text-[10px] tracking-[0.4em] text-[#555] uppercase mb-3">צור קשר</p>
            <h2 className="font-cormorant font-light text-3xl text-white">השאירו פרטים</h2>
          </div>
          <Suspense fallback={<div className="h-64" />}>
            <ContactForm />
          </Suspense>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-6 border-t border-[#1a1a1a] text-center">
        <p className="font-montserrat text-[10px] tracking-widest text-[#333] uppercase">
          Bavarian Motors Club &copy; {new Date().getFullYear()}
        </p>
      </footer>

    </main>
  )
}
