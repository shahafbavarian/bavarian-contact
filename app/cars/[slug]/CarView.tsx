'use client'

import { useEffect, useRef, useState } from 'react'
import type { PublicCar } from '@/lib/car-public'

// A car's page (docs/CAR_PAGE_SPEC.md), in order and in plain sight: the
// gallery (a 3:2 main photo, its thumbnails under it), the name and the price
// with its monthly offer, the key facts as tiles, the full spec in groups, the
// description, the indices, the video, the agent, the listing's number and
// its QR — and the three ways to talk always at hand. It scrolls like a page
// (the owner's decision for the new car page, 31.10.2026). Only the offer's
// terms, the form and the share open over it (spec §5, §8, §9).

const PHONE = '09-9561906', TEL = 'tel:+97299561906', WA = '97299561906'
const AUTO_MS = 4500

// the main photo through the hall's own image variant (already cached there)
const heroSrc = (u: string) => `/_next/image?url=${encodeURIComponent(u)}&w=828&q=85`
const srcOf = (u: string, i: number) => (i === 0 ? heroSrc(u) : u)
const ytId = (u: string) => u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1] ?? null

type Sheet = 'finance' | 'lead' | 'share' | null
type IconK = 'year' | 'km' | 'hand' | 'hp' | 'fuel' | 'body' | 'wa' | 'call' | 'form' | 'share' | 'print' | 'back' | 'close' | 'play' | 'chev'

const POLLUTION = ['#1a6b1a', '#2a8b2a', '#3ea030', '#68be1a', '#90cc00', '#c0d400', '#e0d800', '#f0bc00', '#f08c00', '#e85800', '#d02800', '#b81000', '#980800', '#740404', '#520000']
const SAFETY = ['#520000', '#980800', '#d02800', '#f08c00', '#e0d800', '#68be1a', '#2a8b2a', '#1060c8', '#003690']

function Icon({ k, s = 20 }: { k: IconK; s?: number }) {
  const p = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (k) {
    case 'year': return <svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
    case 'km': return <svg {...p}><path d="M4.5 17a8 8 0 1 1 15 0" /><path d="M12 13l4-4" /></svg>
    case 'hand': return <svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.4-3.6 4-5.4 7-5.4s5.6 1.8 7 5.4" /></svg>
    case 'hp': return <svg {...p}><path d="M13 3L5 14h6l-1 7 8-11h-6z" /></svg>
    case 'fuel': return <svg {...p}><path d="M5 20V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15M4 20h12M15 9h2l2 2.5V17a1.5 1.5 0 0 1-3 0v-3h-1" /><path d="M8 7h4" /></svg>
    case 'body': return <svg {...p}><path d="M3 15v-3l2.5-4.5A2 2 0 0 1 7.3 6.5h9.4a2 2 0 0 1 1.8 1L21 12v3a1 1 0 0 1-1 1h-1M3 15a1 1 0 0 0 1 1h1M9 16h6" /><circle cx="7" cy="16" r="2" /><circle cx="17" cy="16" r="2" /><path d="M4 12h16" /></svg>
    case 'wa': return <svg {...p}><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9l-5.05.9" /><path d="M9 10a.5.5 0 0 0 1 0v-1a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" /></svg>
    case 'call': return <svg {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
    case 'form': return <svg {...p}><path d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16v4M13.5 6.5l4 4" /></svg>
    case 'share': return <svg {...p}><path d="M12 15V3M8 7l4-4 4 4" /><path d="M8 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2" /></svg>
    case 'print': return <svg {...p}><path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7z" /></svg>
    case 'back': return <svg {...p}><path d="M9 6l6 6-6 6" /></svg>
    case 'close': return <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
    case 'play': return <svg {...p}><path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" /></svg>
    case 'chev': return <svg {...p}><path d="M15 6l-6 6 6 6" /></svg>
  }
}

function Scale({ label, value, colors, from, low, high }: { label: string; value: number; colors: string[]; from: number; low: string; high: string }) {
  return (
    <div className="cv-scale">
      <div className="cv-scale-h"><span>{label}</span><b dir="ltr">{value}</b></div>
      <div className="cv-scale-bar" dir="ltr">
        {colors.map((c, i) => <i key={i} style={{ background: c }} data-on={i + from === value ? '' : undefined} />)}
      </div>
      <div className="cv-scale-ends" dir="ltr"><small>{low}</small><small>{high}</small></div>
    </div>
  )
}

export default function CarView({ car, url, qr }: { car: PublicCar; url: string; qr: string }) {
  const [sheet, setSheet] = useState<Sheet>(null)
  const [full, setFull] = useState<number | null>(null)
  const [at, setAt] = useState(0)
  const [play, setPlay] = useState(false)
  const track = useRef<HTMLDivElement>(null), fullTrack = useRef<HTMLDivElement>(null), thumbs = useRef<HTMLDivElement>(null)
  const touched = useRef(0)
  const imgs = car.images
  const km = car.km && (/\d/.test(car.km) ? `${car.km} ק״מ` : car.km)
  const hand = car.hand && (car.hand === 'חדש' ? 'יד חדשה' : `יד ${car.hand}`)

  const tiles = ([
    ['year', 'שנת רישום', car.year], ['km', 'קילומטראז׳', km], ['hand', 'יד', car.hand && (car.hand === 'חדש' ? 'חדשה' : car.hand)],
    ['hp', 'כוח סוס', car.hp], ['fuel', 'סוג דלק', car.fuel], ['body', 'סוג מרכב', car.body],
  ] as [IconK, string, string | null][]).filter(t => t[2])

  // the spec in its groups; a group with nothing in it is not shown (spec §12)
  const groups = ([
    ['כללי', [['יצרן', car.make], ['דגם', car.model], ['רמת גימור', car.trim], ['שנת רישום', car.year], ['יד', car.hand], ['בעלות מקורית', car.ownership], ['קילומטראז׳', km]]],
    ['מנוע וביצועים', [['סוג דלק', car.fuel], ['נפח מנוע', car.engineCc && `${car.engineCc} סמ״ק`], ['כוח סוס', car.hp]]],
    ['מראה', [['סוג מרכב', car.body], ['צבע חוץ', car.colorExt], ['צבע פנים', car.colorInt]]],
    ['מחיר', [['מחירון משוקלל', car.listPrice], ['מחיר מבוקש', car.price]]],
  ] as [string, [string, string | null][]][]).map(([g, rows]) => [g, rows.filter(r => r[1])] as [string, [string, string][]]).filter(([, rows]) => rows.length)

  const waText = car.price
    ? `שלום, אשמח לפרטים על ${car.name}${car.year ? ` ${car.year}` : ''} (מודעה ${car.recNo}):\n${url}`
    : `שלום, אשמח לקבל מחיר עבור ${car.name}${car.year ? ` ${car.year}` : ''} (מודעה ${car.recNo}):\n${url}`
  const waHref = `https://wa.me/${WA}?text=${encodeURIComponent(waText)}`
  const video = car.videos.map(ytId).find(Boolean) ?? null
  const hasIdx = car.pollution != null || car.safety != null
  const statusWord = car.status === 'stock' ? 'במלאי' : 'בדרך לארץ'

  // ── the gallery: it turns by itself, rests a while after a touch ──
  const show = (i: number, smooth = true) => {
    const el = track.current; if (!el) return
    el.scrollTo({ left: -i * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
  }
  useEffect(() => {
    if (imgs.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => {
      if (sheet || full !== null || Date.now() - touched.current < 8000 || document.hidden) return
      const next = (at + 1) % imgs.length
      show(next, next !== 0)
    }, AUTO_MS)
    return () => clearInterval(t)
  }, [at, imgs.length, sheet, full])
  const onTrack = () => { const el = track.current; if (el) setAt(Math.round(Math.abs(el.scrollLeft) / el.clientWidth)) }
  // the strip under the photo follows it
  useEffect(() => { thumbs.current?.children[at]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }) }, [at])

  // the full screen opens at the very photo that was tapped
  useEffect(() => {
    if (full === null) return
    const el = fullTrack.current; if (el) el.scrollLeft = -full * el.clientWidth
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFull(null)
      const t = fullTrack.current; if (!t) return
      if (e.key === 'ArrowLeft') t.scrollBy({ left: -t.clientWidth, behavior: 'smooth' })
      if (e.key === 'ArrowRight') t.scrollBy({ left: t.clientWidth, behavior: 'smooth' })
    }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [full])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(null) }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [])
  // nothing behind a sheet or the full screen scrolls
  useEffect(() => { document.documentElement.toggleAttribute('data-cv-lock', !!sheet || full !== null) }, [sheet, full])

  // ── the form ──
  const [lead, setLead] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setLead('sending')
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        name: f.get('name'), phone: f.get('phone'), website: f.get('website'), rec_no: car.recNo,
        message: `פנייה מעמוד הרכב: ${car.name}${car.year ? ` ${car.year}` : ''} (מודעה ${car.recNo})`,
        device: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      }) })
      setLead(r.ok ? 'sent' : 'error')
    } catch { setLead('error') }
  }

  // ── the share: the link, or the photos with the car's public details ──
  const details = [car.name, car.year && `שנת ${car.year}`, km, hand, car.price].filter(Boolean).join(' · ')
  const [shareMsg, setShareMsg] = useState('')
  const shareLink = async () => {
    try { if (navigator.share) await navigator.share({ title: car.name, text: details, url }); else { await navigator.clipboard.writeText(url); setShareMsg('הקישור הועתק') } } catch {}
  }
  const sharePhotos = async () => {
    setShareMsg('מכין את התמונות…')
    try {
      const files = await Promise.all(imgs.slice(0, 8).map(async (u, i) => {
        const b = await (await fetch(`/api/car-image?url=${encodeURIComponent(u)}`)).blob()
        return new File([b], `${car.recNo}-${i + 1}.jpg`, { type: b.type || 'image/jpeg' })
      }))
      if (navigator.canShare?.({ files })) { await navigator.share({ files, text: `${details}\n${url}` }); setShareMsg('') }
      else setShareMsg('המכשיר הזה לא תומך בשיתוף תמונות — אפשר לשתף את הקישור')
    } catch { setShareMsg('') }
  }

  const Talk = ({ where }: { where: 'bar' | 'side' }) => (
    <div className={where === 'bar' ? 'cv-talk cv-talk-bar' : 'cv-talk'}>
      <a className="cv-btn cv-primary" href={waHref} target="_blank" rel="noopener noreferrer"><Icon k="wa" />{car.price ? 'WhatsApp' : 'בקשת מחיר'}</a>
      <a className="cv-btn" href={TEL} aria-label={`התקשרו ${PHONE}`}><Icon k="call" />התקשרו</a>
      <button type="button" className="cv-btn" onClick={() => { setLead('idle'); setSheet('lead') }}><Icon k="form" />השאירו פרטים</button>
    </div>
  )

  return (
    <div className="cv">
      <header className="cv-bar">
        <a href="/showroom/cars" className="cv-ic" aria-label="לכל הרכבים"><Icon k="back" /></a>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <a href="/showroom" className="cv-logo-a" aria-label="בוואריאן מוטורס"><img className="cv-logo" src="/brand/logo-horizontal-dark.png" alt="בוואריאן מוטורס" width={1244} height={200} /></a>
        <div className="cv-bar-end">
          <button type="button" className="cv-ic" aria-label="שיתוף" onClick={() => setSheet('share')}><Icon k="share" /></button>
          <button type="button" className="cv-ic" aria-label="הדפסה" onClick={() => print()}><Icon k="print" /></button>
        </div>
      </header>

      <main className="cv-page">
        {/* ── the gallery ── */}
        <section className="cv-gallery" aria-label="תמונות הרכב">
          <div className="cv-photo">
            <div ref={track} className="cv-track" onScroll={onTrack} onPointerDown={() => { touched.current = Date.now() }}>
              {imgs.map((u, i) => (
                <button key={u} type="button" className="cv-slide" aria-label={`תמונה ${i + 1} במסך מלא`} onClick={() => setFull(i)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={srcOf(u, i)} alt={i === 0 ? car.name : ''} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" fetchPriority={i === 0 ? 'high' : undefined} draggable={false} />
                </button>
              ))}
            </div>
            {imgs.length > 1 && <span className="cv-count" dir="ltr">{at + 1} / {imgs.length}</span>}
          </div>
          {imgs.length > 1 && (
            <div ref={thumbs} className="cv-thumbs" role="tablist" aria-label="תמונות ממוזערות">
              {imgs.map((u, i) => (
                <button key={u} type="button" role="tab" aria-selected={i === at} aria-label={`תמונה ${i + 1}`} onClick={() => { touched.current = Date.now(); show(i) }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={srcOf(u, i)} alt="" loading="lazy" decoding="async" draggable={false} />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── the name, the price, the offer (beside the gallery on a computer) ── */}
        <aside className="cv-side">
          <section className="cv-card cv-title">
            <p className="cv-status" data-s={car.status}><i />{statusWord}<span>מודעה <bdi dir="ltr">{car.recNo}</bdi></span></p>
            <h1 className="cv-name">
              <bdi dir="ltr"><b>{car.make}</b> {car.model}</bdi>
              {car.trim && <bdi dir="ltr" className="cv-trim">{car.trim}</bdi>}
            </h1>
            <div className="cv-price">
              {car.price ? <strong dir="ltr">{car.price}</strong> : (
                <a className="cv-ask" href={waHref} target="_blank" rel="noopener noreferrer"><Icon k="wa" />בקשו מחיר ב-WhatsApp</a>
              )}
            </div>
            {car.finance && (
              <button type="button" className="cv-monthly" onClick={() => setSheet('finance')}>
                <span className="cv-monthly-v"><b dir="ltr">{car.finance.monthly}</b> לחודש</span>
                <span className="cv-monthly-l">פרטי הצעת המימון<Icon k="chev" s={16} /></span>
              </button>
            )}
            <Talk where="side" />
          </section>
        </aside>

        {/* ── the key facts ── */}
        {tiles.length > 0 && (
          <ul className="cv-tiles" aria-label="נתונים עיקריים">
            {tiles.map(([k, l, v]) => (
              <li key={k}><Icon k={k} s={22} /><small>{l}</small><bdi>{v}</bdi></li>
            ))}
          </ul>
        )}

        {/* ── the full spec, in its groups ── */}
        <section className="cv-card" aria-labelledby="cv-spec-h">
          <h2 id="cv-spec-h">מפרט</h2>
          {groups.map(([g, rows]) => (
            <div key={g} className="cv-group">
              <h3>{g}</h3>
              <dl className="cv-rows">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd><bdi>{v}</bdi></dd></div>)}</dl>
            </div>
          ))}
        </section>

        {car.description && (
          <section className="cv-card" aria-labelledby="cv-about-h">
            <h2 id="cv-about-h">תיאור ותוספות</h2>
            <p className="cv-about">{car.description}</p>
          </section>
        )}

        {hasIdx && (
          <section className="cv-card" aria-labelledby="cv-idx-h">
            <h2 id="cv-idx-h">זיהום ובטיחות</h2>
            {car.pollution != null && <Scale label="דרגת זיהום אוויר" value={car.pollution} colors={POLLUTION} from={1} low="1 · מזהם פחות" high="15 · מזהם יותר" />}
            {car.safety != null && <Scale label="רמת אבזור בטיחותי" value={car.safety} colors={SAFETY} from={0} low="0 · נמוכה" high="8 · גבוהה" />}
          </section>
        )}

        {video && (
          <section className="cv-card" aria-labelledby="cv-vid-h">
            <h2 id="cv-vid-h">סרטון</h2>
            <div className="cv-video">
              {play ? (
                <iframe src={`https://www.youtube-nocookie.com/embed/${video}?autoplay=1&playsinline=1&rel=0`} title={`סרטון ${car.name}`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
              ) : (
                <button type="button" className="cv-video-poster" onClick={() => setPlay(true)} aria-label={`הפעלת הסרטון של ${car.name}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${video}/hqdefault.jpg`} alt="" loading="lazy" />
                  <span className="cv-play"><Icon k="play" s={26} /></span>
                </button>
              )}
            </div>
          </section>
        )}

        {car.agent && (
          <a className="cv-card cv-agent" href={car.agent.href}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {car.agent.photo && <img src={car.agent.photo} alt="" />}
            <span><small>הנציג של הרכב</small><b>{car.agent.name}</b>{car.agent.title && <em>{car.agent.title}</em>}</span>
            <Icon k="chev" s={18} />
          </a>
        )}

        <section className="cv-card cv-id">
          <div>
            <h2>מודעה <bdi dir="ltr">{car.recNo}</bdi></h2>
            <p>סרקו כדי לפתוח את המודעה בנייד</p>
            <div className="cv-id-act">
              <button type="button" className="cv-btn cv-small" onClick={() => setSheet('share')}><Icon k="share" s={18} />שיתוף</button>
              <button type="button" className="cv-btn cv-small" onClick={() => print()}><Icon k="print" s={18} />הדפסה</button>
            </div>
          </div>
          {qr && <i className="cv-qr" aria-label="קוד QR למודעה" dangerouslySetInnerHTML={{ __html: qr }} />}
        </section>
      </main>

      {/* ── the ways to talk, always at hand on a phone ── */}
      <Talk where="bar" />

      {/* ── what opens over the page: the offer's terms, the form, the share ── */}
      <div className="cv-dim" data-on={sheet ? '' : undefined} onClick={() => setSheet(null)} aria-hidden="true" />

      {car.finance && (
        <section className="cv-sheet" data-open={sheet === 'finance' || undefined} aria-label="הצעת המימון" aria-hidden={sheet !== 'finance'}>
          <SheetHead title="הצעת המימון" onClose={() => setSheet(null)} />
          <div className="cv-sheet-in">
            <dl className="cv-rows cv-fin">
              {car.finance.down && <div><dt>מקדמה</dt><dd dir="ltr">{car.finance.down}</dd></div>}
              <div><dt>תשלום חודשי</dt><dd dir="ltr">{car.finance.monthly}</dd></div>
              <div><dt>מספר חודשים</dt><dd>{car.finance.months}</dd></div>
              {car.finance.balloon && <div><dt>תשלום בסוף התקופה</dt><dd dir="ltr">{car.finance.balloon}</dd></div>}
            </dl>
            {car.finance.note && <p className="cv-note">{car.finance.note}</p>}
          </div>
        </section>
      )}

      <section className="cv-sheet" data-open={sheet === 'lead' || undefined} aria-label="השארת פרטים" aria-hidden={sheet !== 'lead'}>
        <SheetHead title="השאירו פרטים ונחזור אליכם" onClose={() => setSheet(null)} />
        <div className="cv-sheet-in">
          {lead === 'sent' ? <p className="cv-done">תודה! נחזור אליכם בהקדם.</p> : (
            <form className="cv-form" onSubmit={send}>
              <p className="cv-form-car"><bdi dir="ltr">{car.name}</bdi> · מודעה {car.recNo}</p>
              <label>שם מלא <small>(לא חובה)</small><input name="name" autoComplete="name" /></label>
              <label>טלפון<input name="phone" type="tel" inputMode="tel" autoComplete="tel" required dir="ltr" /></label>
              <input name="website" tabIndex={-1} autoComplete="off" className="cv-hp" aria-hidden="true" />
              <button type="submit" className="cv-btn cv-primary" disabled={lead === 'sending'}>{lead === 'sending' ? 'שולח…' : 'שליחה'}</button>
              {lead === 'error' && <p className="cv-err">השליחה לא הצליחה. אפשר לנסות שוב או לכתוב לנו ב-WhatsApp.</p>}
            </form>
          )}
        </div>
      </section>

      <section className="cv-sheet" data-open={sheet === 'share' || undefined} aria-label="שיתוף" aria-hidden={sheet !== 'share'}>
        <SheetHead title="שיתוף המודעה" onClose={() => setSheet(null)} />
        <div className="cv-sheet-in cv-share">
          <button type="button" className="cv-btn" onClick={shareLink}><Icon k="share" />שיתוף קישור</button>
          <button type="button" className="cv-btn" onClick={sharePhotos}><Icon k="share" />שיתוף תמונות ופרטים</button>
          {shareMsg && <p className="cv-note" role="status">{shareMsg}</p>}
        </div>
      </section>

      {/* ── the full-screen gallery, at the photo that was tapped ── */}
      {full !== null && (
        <div className="cv-full" role="dialog" aria-modal="true" aria-label="תמונות במסך מלא">
          <div ref={fullTrack} className="cv-full-track">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {imgs.map((u, i) => <img key={u} src={srcOf(u, i)} alt="" decoding="async" draggable={false} />)}
          </div>
          <button type="button" className="cv-ic cv-full-x" aria-label="סגירה" onClick={() => setFull(null)}><Icon k="close" /></button>
        </div>
      )}

      {/* ── the print template: public details only (spec §10) ── */}
      <div className="cv-print" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="cv-print-logo" src="/brand/logo-horizontal-dark.png" alt="" />
        <h2 dir="ltr">{car.name}</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {car.hero && <img className="cv-print-hero" src={heroSrc(car.hero)} alt="" />}
        <p className="cv-print-price">{car.price ?? 'מחיר לפי בקשה'}{car.finance ? ` · ${car.finance.monthly} לחודש` : ''}</p>
        {groups.map(([g, rows]) => <dl key={g} className="cv-rows">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd><bdi>{v}</bdi></dd></div>)}</dl>)}
        <div className="cv-print-id"><span>מודעה {car.recNo} · {PHONE}</span>{qr && <i className="cv-qr" dangerouslySetInnerHTML={{ __html: qr }} />}</div>
      </div>
    </div>
  )
}

function SheetHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="cv-sheet-h">
      <i className="cv-grab" aria-hidden="true" />
      <h2>{title}</h2>
      <button type="button" className="cv-ic" aria-label="סגירה" onClick={onClose}><Icon k="close" /></button>
    </div>
  )
}
