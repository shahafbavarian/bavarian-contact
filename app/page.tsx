'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const WHATSAPP_NUMBER = '97299561906'
const PHONE_NUMBER = '099561906'

const BG_FIXED = '/BG0.PNG'
const CAR_IMAGES = ['/1.PNG', '/2.PNG', '/3.PNG', '/4.PNG']

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
  const [phoneError, setPhoneError] = useState('')

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
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full bg-[#0e0e0e] border border-white/10 rounded-2xl px-6 pb-8 pt-5"
        style={{ maxHeight: '90vh', overflowY: 'auto', direction: 'rtl' }}
      >
        {/* Header */}
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
                <a
                  href="https://bavarian-motors.co.il"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 py-3 rounded-xl font-heebo text-sm text-white border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M2 12h20M12 2c-2.5 3-4 6.5-4 10s1.5 7 4 10M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  bavarian-motors.co.il
                </a>
                <a
                  href="https://www.instagram.com/bavarianmotors?igsh=MTk0MTgxY3R3N2Z5YQ=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 py-3 rounded-xl font-heebo text-sm text-white border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                  </svg>
                  Instagram
                </a>
                <a
                  href="https://youtube.com/@bavarianmotorsclub?si=9Zr3-jPY5xKbuScH"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 py-3 rounded-xl font-heebo text-sm text-white border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z" stroke="currentColor" strokeWidth="1.5" />
                    <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
                  </svg>
                  YouTube
                </a>
              </div>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                {phoneError && (
                  <p className="mt-1.5 font-inter text-xs text-red-400">{phoneError}</p>
                )}
              </div>

              <div>
                <label className="block font-inter text-[10px] tracking-widest text-white/30 uppercase mb-2">
                  שם מלא
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="הכנס את שמך"
                  className="w-full bg-white/5 border border-white/10 px-4 py-3.5 font-inter text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors rounded-xl"
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
  const [showDesktop, setShowDesktop] = useState(false)
  const [desktopScale, setDesktopScale] = useState(1)
  const [isDesktop, setIsDesktop] = useState(false)
  const [fadeStart, setFadeStart] = useState(61)
  const [blackoutStart, setBlackoutStart] = useState(67)
  const touchStartX = useRef<number | null>(null)
  const autoplayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDesktopScale(Math.min(window.innerWidth / 1280, (window.innerHeight - 40) / 720))
    const mq = window.matchMedia('(min-aspect-ratio: 4/3)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => { setIsDesktop(e.matches); setCurrentIndex(0); setNextIndex(null) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    function computeFade() {
      const ratio = window.innerWidth / window.innerHeight
      const ratio169 = 16 / 9
      // Anchor the fade to the same point in the image (67% of image height).
      // With the -18% top offset: viewport% = imgPt * 1.18 - 0.18 = 61% (constant).
      // On screens taller than 16:9, expand the fade zone proportionally.
      const t = Math.max(0, Math.min(1, (ratio169 - ratio) / (ratio169 - 4 / 3)))
      const delta = Math.round(t * 8)
      setFadeStart(61 - delta)
      setBlackoutStart(67 - delta)
    }
    computeFade()
    window.addEventListener('resize', computeFade)
    return () => window.removeEventListener('resize', computeFade)
  }, [])

  useEffect(() => {
    setUtmSource(searchParams.get('utm_source') ?? '')
    setUtmCampaign(searchParams.get('utm_campaign') ?? '')
  }, [searchParams])

  function goToBg(dir: 1 | -1) {
    if (nextIndex !== null) return
    const len = CAR_IMAGES.length
    const next = (currentIndex + dir + len) % len
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

  // Auto slideshow
  useEffect(() => {
    autoplayRef.current = setTimeout(() => goToBg(1), 5000)
    return () => { if (autoplayRef.current) clearTimeout(autoplayRef.current) }
  }, [currentIndex, nextIndex])

  // Touch swipe
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) goToBg(dx > 0 ? 1 : -1)
    touchStartX.current = null
  }

  return (
    <main
      dir="rtl"
      style={{ height: '100%', overflow: 'hidden', position: 'relative', background: '#000' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ─── Fixed Background ─── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BG_FIXED}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
      </div>

      {/* ─── Rotating Car Images ─── */}
      {CAR_IMAGES.map((src, i) => (
        <div
          key={src}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: getBgOpacity(i),
            transition: 'opacity 0.6s ease-in-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
          />
        </div>
      ))}

      {/* ─── Spotlight Effects ─── */}
      <style>{`
        @keyframes logoShimmer {
          0%   { transform: translateX(-180%) skewX(-18deg); opacity: 0; }
          4%   { opacity: 1; }
          38%  { transform: translateX(280%) skewX(-18deg); opacity: 1; }
          43%  { opacity: 0; }
          44%, 100% { transform: translateX(-180%) skewX(-18deg); opacity: 0; }
        }
        @keyframes spotlightA {
          0%, 100% { transform: rotate(-9deg); opacity: 0.85; }
          50% { transform: rotate(7deg); opacity: 0.45; }
        }
        @keyframes spotlightB {
          0%, 100% { transform: rotate(11deg); opacity: 0.55; }
          50% { transform: rotate(-8deg); opacity: 0.9; }
        }
        @keyframes spotlightC {
          0%, 100% { transform: rotate(3deg); opacity: 0.4; }
          50% { transform: rotate(-11deg); opacity: 0.7; }
        }
        @keyframes btnPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
          50% {
            box-shadow:
              0 0 0 1.5px rgba(255,255,255,0.65),
              0 0 8px 2px rgba(255,255,255,0.28),
              0 0 18px 5px rgba(255,255,255,0.12);
          }
        }
        @keyframes btnPulseWA {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,211,102,0); }
          50% {
            box-shadow:
              0 0 0 1.5px rgba(37,211,102,0.8),
              0 0 10px 3px rgba(37,211,102,0.38),
              0 0 22px 7px rgba(37,211,102,0.16);
          }
        }
        @keyframes waIconGlow {
          0%, 100% { color: #000; filter: drop-shadow(0 0 0px rgba(37,211,102,0)); }
          50% {
            color: #25D366;
            filter: drop-shadow(0 0 4px rgba(37,211,102,0.9)) drop-shadow(0 0 9px rgba(37,211,102,0.5));
          }
        }
      `}</style>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* Left beam — center at 25% */}
        <div style={{
          position: 'absolute', top: 0, left: '6%',
          width: '38%', height: '72%',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 55%, transparent 100%)',
          clipPath: 'polygon(38% 0%, 62% 0%, 88% 100%, 12% 100%)',
          transformOrigin: '50% 0%',
          animation: 'spotlightA 13s ease-in-out infinite',
        }} />
        {/* Center beam — center at 50% */}
        <div style={{
          position: 'absolute', top: 0, left: '32.5%',
          width: '35%', height: '80%',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 55%, transparent 100%)',
          clipPath: 'polygon(35% 0%, 65% 0%, 92% 100%, 8% 100%)',
          transformOrigin: '50% 0%',
          animation: 'spotlightB 17s ease-in-out infinite',
        }} />
        {/* Right beam — center at 75% */}
        <div style={{
          position: 'absolute', top: 0, left: '60%',
          width: '30%', height: '65%',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.04) 0%, transparent 100%)',
          clipPath: 'polygon(40% 0%, 60% 0%, 85% 100%, 15% 100%)',
          transformOrigin: '50% 0%',
          animation: 'spotlightC 20s ease-in-out infinite',
        }} />
      </div>

      {/* ─── Side Arrows ─── */}
      <button
        onClick={() => goToBg(1)}
        style={{
          position: 'absolute',
          left: 12,
          top: '42%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          cursor: 'pointer',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        onClick={() => goToBg(-1)}
        style={{
          position: 'absolute',
          right: 12,
          top: '42%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          cursor: 'pointer',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* ─── Gradient Overlay ─── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          background: `linear-gradient(to bottom, transparent ${fadeStart}%, rgba(0,0,0,0.12) ${fadeStart + 9}%, rgba(0,0,0,0.55) ${fadeStart + 22}%, rgba(0,0,0,0.65) ${fadeStart + 28}%)`,
          pointerEvents: 'none',
        }}
      />

      {/* ─── Logo ─── */}
      <div style={{
        position: 'absolute',
        top: isDesktop ? -8 : '8%',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 5,
        pointerEvents: 'none',
      }}>
        <img
          src="/LOGO.PNG"
          alt="Bavarian Motors"
          style={{ height: isDesktop ? 130 : 120, width: 'auto', display: 'block' }}
        />
      </div>

      {/* ─── Strong bottom blackout (desktop only) ─── */}
      {isDesktop && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background: `linear-gradient(to bottom, transparent ${blackoutStart}%, rgba(0,0,0,0.6) ${blackoutStart + 8}%, #000 ${blackoutStart + 20}%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ─── Solid black bar at very bottom (mobile only) ─── */}
      {!isDesktop && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 'calc(58px + env(safe-area-inset-bottom, 0px))',
            background: '#000',
            zIndex: 3,
          }}
        />
      )}

      {/* ─── Bottom Content ─── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 4,
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 0,
          paddingBottom: isDesktop ? '18px' : 'calc(52px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Dots — mobile only: above headlines */}
        {!isDesktop && (
          <div className="flex justify-center gap-1 mb-2">
            {CAR_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => jumpToBg(i)}
                style={{
                  width: i === currentIndex ? 14 : 4,
                  height: 4,
                  borderRadius: 2,
                  background: i === currentIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>
        )}

        {/* Headlines */}
        <div className="mb-5">
          <h1 className="font-heebo font-black text-[24px] text-white leading-tight">
            מלאי נרחב של רכבי יוקרה וספורט
            <br />
            מחכה לכם בבוואריאן מוטורס!
          </h1>
          <p className="font-heebo font-light text-[20px] text-white/50 leading-tight mt-0.5">
            בואו להנות מאבזור עשיר, שירות אישי
            <br />
            ומהיר ויתרון במחיר!
          </p>
        </div>

        {/* Dots — desktop only: above buttons */}
        {isDesktop && (
          <div className="flex justify-center gap-1 mb-2">
            {CAR_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => jumpToBg(i)}
              style={{
                width: i === currentIndex ? 14 : 4,
                height: 4,
                borderRadius: 2,
                background: i === currentIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.3s',
              }}
            />
          ))}
          </div>
        )}

        {/* ─── 3 Buttons ─── */}
        <div className="grid grid-cols-3 gap-2.5">

          {/* WhatsApp */}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl font-inter text-[12px] font-medium text-black transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.92)', animation: 'btnPulseWA 4s ease-in-out 0s infinite' }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" style={{ animation: 'waIconGlow 4s ease-in-out 0s infinite' }}>
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
              animation: 'btnPulse 4s ease-in-out 0s infinite',
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
              animation: 'btnPulse 4s ease-in-out 0s infinite',
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

      {/* ─── Dev: Desktop Preview Overlay ─── */}
      {showDesktop && <DesktopPreviewOverlay scale={desktopScale} onClose={() => setShowDesktop(false)} />}

      {/* ─── Dev: Desktop Preview Button ─── */}
      <button
        onClick={() => setShowDesktop(true)}
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(8px)',
          color: 'rgba(255,255,255,0.65)',
          fontSize: 11,
          fontFamily: 'var(--font-inter)',
          padding: '4px 12px',
          borderRadius: 20,
          cursor: 'pointer',
          letterSpacing: '0.05em',
        }}
      >
        🖥 desktop
      </button>

    </main>
  )
}

function DesktopPreviewOverlay({ scale, onClose }: { scale: number; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#111', zIndex: 300, overflow: 'hidden' }}>
      {/* toolbar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 40,
        background: '#222', borderBottom: '1px solid #333',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', zIndex: 301, fontFamily: 'var(--font-inter)',
      }}>
        <span style={{ color: '#888', fontSize: 12 }}>Desktop preview — 1280×720 (16:9)</span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#aaa', fontSize: 12, padding: '3px 12px', borderRadius: 6, cursor: 'pointer',
          }}
        >✕ סגור</button>
      </div>
      {/* scaled iframe — centered */}
      <div style={{
        position: 'absolute', top: 40, left: 0, right: 0, bottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          transformOrigin: 'center center',
          transform: `scale(${scale})`,
          width: 1280,
          height: 720,
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          <iframe
            src="/"
            style={{ width: 1280, height: 720, border: 'none', display: 'block' }}
          />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ height: '100vh', background: '#000' }} />}>
      <PageContent />
    </Suspense>
  )
}
