'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Card, SceneHandle } from './scene'
import { INSTAGRAM_URL } from '@/lib/agent-format'
import { AVAIL, PRICES, SORTS, carsWord, lineOf, makesOf, modelsOf, norm, priceNum, rank, type Avail, type Option, type Ranked, type Sort } from './search'

const WHATSAPP = 'https://wa.me/97299561906'
// the hall's Facebook page, as linked from the main site
const FACEBOOK = 'https://www.facebook.com/bavarianmotorsclub'

const fit = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)))

// One gesture walks you in: a scroll, a swipe up or the arrow key plays the
// whole entrance (street → doors → the stand) as one continuous move; the
// opposite gesture walks you back out. The page itself never scrolls. Inside,
// the gallery turns only sideways: finger, mouse or the arrows.
export default function Showroom({ cards }: { cards: Card[] }) {
  const router = useRouter()
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const cap = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const floor = useRef<HTMLDivElement>(null)
  const goRef = useRef<(dest: 0 | 1) => void>(() => {})
  const nav = useRef<HTMLElement>(null)
  const arrows = useRef<HTMLDivElement>(null)
  const sign = useRef<HTMLDivElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const handle = useRef<SceneHandle | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [, setFront] = useState(0)
  // inside: how many pages of cards (one page: no arrows)
  const [pages, setPages] = useState(1)
  // a fresh random order on every refresh: stock and on-the-way, mixed
  const [deck] = useState(() => {
    const d = [...cards]
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); ;[d[i], d[j]] = [d[j], d[i]] }
    return d
  })
  const [menu, setMenu] = useState(false)
  const menuOpen = useRef(false)
  menuOpen.current = menu

  // Inside, the hall is the stock's search, in steps: the field asks for a
  // maker (the makers offered as you type), then one of its models; beside
  // it, filter and order. The cards in the hall are the cars that answer
  const input = useRef<HTMLInputElement>(null)
  const [make, setMake] = useState<string | null>(null)
  const [model, setModel] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')   // the text, a beat later: the cards move once typing pauses
  const [focus, setFocus] = useState(false)
  const [active, setActive] = useState(0)
  const [panel, setPanel] = useState<'filter' | 'sort' | null>(null)
  const [avail, setAvail] = useState<Avail>('all')
  const [price, setPrice] = useState(-1)
  const [sort, setSort] = useState<Sort>('mix')
  useEffect(() => { const t = setTimeout(() => setQuery(text), 140); return () => clearTimeout(t) }, [text])
  useEffect(() => { setActive(0) }, [text, make, model])
  const searchable = useMemo(() => deck.map(c => ({ make: c.make ?? c.title, model: c.model ?? '', year: c.year ?? '', price: c.price ?? '', stock: c.stock ?? true })), [deck])
  const makes = useMemo(() => makesOf(searchable), [searchable])
  const models = useMemo(() => (make ? modelsOf(searchable, make) : []), [searchable, make])
  const stage: 'make' | 'model' | 'done' = !make ? 'make' : !model ? 'model' : 'done'
  const items: Ranked[] = useMemo(() => {
    if (stage === 'done') return []
    const r = rank(stage === 'make' ? makes : models, text)
    const all: Option = { key: '', label: 'כל הדגמים', count: models.reduce((a, o) => a + o.count, 0), he: [], extra: '' }
    return stage === 'model' && !text.trim() ? [{ opt: all, hit: null }, ...r] : r
  }, [stage, makes, models, text])
  const listOpen = focus && !panel && items.length > 0
  const filtersOn = avail !== 'all' || price >= 0
  const found = useMemo(() => {
    const qn = norm(query)
    if (!make && !qn && !filtersOn && sort === 'mix') return null
    // typed but not yet picked: the cars of every maker (or line) still offered
    const keys = qn && stage !== 'done' ? new Set(rank(stage === 'make' ? makes : models, query).map(r => norm(r.opt.key))) : null
    const ids = searchable.flatMap((c, i) => {
      if (make && norm(c.make) !== norm(make)) return []
      if (model && lineOf(c.model) !== model) return []
      if (keys && !keys.has(norm(stage === 'make' ? c.make : lineOf(c.model)))) return []
      if (avail === 'stock' && !c.stock) return []
      if (avail === 'way' && c.stock) return []
      if (price >= 0) { const n = priceNum(c.price); if (n === null || n < PRICES[price].min || n >= PRICES[price].max) return [] }
      return [i]
    })
    const pn = (i: number) => priceNum(searchable[i].price)
    const yr = (i: number) => parseInt(searchable[i].year, 10) || 0
    if (sort === 'new') ids.sort((a, b) => yr(b) - yr(a))
    if (sort === 'cheap') ids.sort((a, b) => (pn(a) ?? Infinity) - (pn(b) ?? Infinity))
    if (sort === 'dear') ids.sort((a, b) => (pn(b) ?? -1) - (pn(a) ?? -1))
    return ids
  }, [searchable, makes, models, make, model, stage, query, avail, price, sort, filtersOn])
  const viewRef = useRef<number[] | null>(null)
  useEffect(() => { viewRef.current = found; handle.current?.setView(found) }, [found])
  const pick = (o: Option) => {
    setText(''); setQuery('')
    if (stage === 'make') { setMake(o.key); return }           // on to its models: the field stays open
    setModel(o.key || null); input.current?.blur()               // done: the hall shows them
  }
  const dropMake = () => { setMake(null); setModel(null); input.current?.focus() }
  const dropModel = () => { setModel(null); input.current?.focus() }
  const clearAll = () => { setMake(null); setModel(null); setText(''); setQuery(''); setAvail('all'); setPrice(-1); setSort('mix') }
  const onFieldKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (!listOpen || (text && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))) return
      e.preventDefault()
      const fwd = e.key === 'ArrowDown' || e.key === 'ArrowLeft'   // the line reads right to left
      setActive(a => (a + (fwd ? 1 : -1) + items.length) % items.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (listOpen && (text.trim() || active > 0)) pick(items[Math.min(active, items.length - 1)].opt)
      else input.current?.blur()
    } else if (e.key === 'Backspace' && !text) {
      if (model) setModel(null); else if (make) setMake(null)
    } else if (e.key === 'Escape') {
      e.preventDefault(); if (text) setText(''); else input.current?.blur()
    }
  }
  const mark = (r: Ranked) => r.hit
    ? <>{r.opt.label.slice(0, r.hit[0])}<b>{r.opt.label.slice(r.hit[0], r.hit[1])}</b>{r.opt.label.slice(r.hit[1])}</>
    : r.opt.label
  const onPd = (e: React.PointerEvent) => e.preventDefault()   // a press that leaves the field its focus

  useEffect(() => {
    const cv = canvas.current!
    if (!cv.getContext('webgl2')) { setState('fallback'); return }

    const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 900
    // two remembered states: a refresh while inside opens inside
    let inside = false
    try { inside = sessionStorage.getItem('sr-view') === 'in' } catch {}
    let current = inside ? 1 : 0, vel = 0, target = inside ? 1 : 0, last = performance.now(), raf = 0, alive = true
    // the walk: a timed ease of the target from where it is to 0 (outside) or
    // 1 (inside). A gesture the other way turns it around at any moment.
    let from = 0, to = 0, t0 = 0, dur = 0
    const DUR = mobile ? 3200 : 3600
    // moves at once and slows into the arrival (the spring below softens the start)
    const ease = (x: number) => 1 - (1 - x) ** 3
    const go = (dest: 0 | 1) => {
      if (dur ? to === dest : target === dest) return
      from = target; to = dest; t0 = performance.now(); dur = DUR * Math.abs(dest - target)
      if (dest === 0) { if (document.activeElement === input.current) input.current?.blur(); setPanel(null) }
      try { sessionStorage.setItem('sr-view', dest === 1 ? 'in' : 'out') } catch {}
    }
    goRef.current = go
    // capIn: the foot of the hall is on screen (its row pours in); arrived:
    // the walk in has ended, and on a computer the field takes the keyboard
    // (a phone opens its keyboard only for a tap: there the field waits, lit)
    let capIn = false, arrived = false
    const frame = (now: number) => {
      if (!alive) return
      raf = requestAnimationFrame(frame)
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now
      if (dur) {
        const k = Math.min(1, (now - t0) / dur)
        target = from + (to - from) * ease(k)
        if (k >= 1) { target = to; dur = 0 }
      }
      // the camera follows the target on a critically damped spring, so a
      // turn back eases through instead of snapping
      const w = 2 / 0.12, x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
      const off = current - target, tmp = (vel + w * off) * dt
      vel = (vel - w * tmp) * e
      current = Math.min(1, Math.max(0, target + (off + tmp) * e))
      if (!dur && Math.abs(current - target) < 1e-4 && Math.abs(vel) < 1e-3) { current = target; vel = 0 }
      handle.current?.setProgress(current)
      const c = cap.current
      if (c) {
        const s = fit(current, 0.86, 0.93)
        c.style.opacity = String(s); c.style.visibility = s > 0.01 ? 'visible' : 'hidden'
        const on = s > 0.5
        if (on !== capIn) { capIn = on; c.toggleAttribute('data-in', on) }
        // the phone's keyboard: the row rides just above it
        const vv = visualViewport, inp = input.current
        const lift = vv && inp && document.activeElement === inp ? Math.max(0, document.documentElement.clientHeight - vv.height - vv.offsetTop) : 0
        c.style.transform = `translateY(${(1 - s) * 14 - lift}px)`
        if (target === 1 && !dur && current > 0.97) {
          if (!arrived) { arrived = true; if (!mobile) inp?.focus({ preventScroll: true }) }
        } else if (target === 0) arrived = false
        const a = arrows.current
        if (a) { a.style.opacity = String(s); a.style.visibility = s > 0.01 ? 'visible' : 'hidden' }
      }
      // The sign lives on the building; the site's bar slides in as you walk through the doors
      if (nav.current) {
        const l = fit(current, 0.42, 0.6)
        nav.current.style.opacity = String(l); nav.current.style.visibility = l > 0.01 ? 'visible' : 'hidden'
        nav.current.style.transform = `translateY(${(1 - l) * -10}px)`
      }
      if (bar.current) bar.current.style.transform = `scaleX(${current})`
      // the street's buttons give way as soon as you step in
      if (floor.current) { const f = 1 - fit(current, 0.02, 0.1); floor.current.style.opacity = String(f); floor.current.style.visibility = f > 0.01 ? 'visible' : 'hidden' }
    }

    const onPointer = (e: PointerEvent) => handle.current?.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1))
    let rTimer = 0
    // Resize at once (a delayed resize showed a stretched frame while turning
    // the phone), and again once Safari has settled its bars after a rotation
    // Inside, the cards keep clear of the bar above and the search row below
    // (measured, never assumed), and of the arrows at the sides on a computer
    let gridMid = 0
    const insets = () => {
      const n = nav.current, c = cap.current
      const top = (n ? n.offsetTop + n.offsetHeight : 64) + 14
      const capBottom = c ? c.offsetTop + c.offsetHeight : cv.clientHeight - 30
      const bottom = cv.clientHeight - capBottom + 124   // the search row and its line of words
      gridMid = (top + cv.clientHeight - bottom) / 2
      handle.current?.setInsets(top, bottom, mobile ? 16 : 84)
    }
    const onResize = () => {
      handle.current?.resize(); insets()
      clearTimeout(rTimer); rTimer = window.setTimeout(() => { handle.current?.resize(); insets() }, 350)
    }
    // gestures: wheel, a vertical swipe, keys. Inside, a sideways scroll turns
    // the gallery by one card per gesture (a trackpad's long tail counts once)
    let wheelLock = false, wheelTimer = 0
    const onWheel = (e: WheelEvent) => {
      if (inLine(e)) return
      e.preventDefault()
      if (menuOpen.current) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        clearTimeout(wheelTimer); wheelTimer = window.setTimeout(() => { wheelLock = false }, 180)
        if (current > 0.95 && !wheelLock && Math.abs(e.deltaX) > 6) { wheelLock = true; handle.current?.step(e.deltaX > 0 ? -1 : 1) }
        return
      }
      if (Math.abs(e.deltaY) > 4) go(e.deltaY > 0 ? 1 : 0)
    }
    let ty = 0, tx = 0
    const onTouchStart = (e: TouchEvent) => { ty = e.touches[0].clientY; tx = e.touches[0].clientX }
    // the line of words scrolls sideways on its own
    const inLine = (e: Event) => !!(e.target as Element | null)?.closest?.('.sr-words')
    const onTouchMove = (e: TouchEvent) => { if (!menuOpen.current && !inLine(e)) e.preventDefault() }
    const onTouchEnd = (e: TouchEvent) => {
      if (menuOpen.current || inLine(e)) return
      const dy = e.changedTouches[0].clientY - ty, dx = e.changedTouches[0].clientX - tx
      if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx)) {
        // with the keyboard up, a swipe only puts it away
        if (document.activeElement === input.current) { input.current?.blur(); return }
        go(dy < 0 ? 1 : 0)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return   // typing belongs to the field
      if (e.key === 'Escape') { setMenu(false); setPanel(null); return }
      if (menuOpen.current) return
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1) }
      if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(0) }
      // sideways, right to left: the left arrow is the next page
      if (current > 0.95 && e.key === 'ArrowLeft') handle.current?.step(1)
      if (current > 0.95 && e.key === 'ArrowRight') handle.current?.step(-1)
    }

    import('./scene').then(({ createShowroom }) => {
      if (!alive) return
      try {
        handle.current = createShowroom(cv, {
          mobile, cards: deck,
          logoUrl: '/brand/logo-light.png',
          // the sign rides on its spot of the stone: centre and width come from the scene
          onSign: (x, y, w, fade) => {
            const el = sign.current; if (!el) return
            // The haze: walking up, the sign rises past the top of the screen while
            // the scene scales it up many times, and its halo (scaled with it)
            // spilled into view as a white glow with no letters. It fades out on its
            // way to the top edge, before it leaves the screen, and before it grows
            const f = fade * fit(y, innerHeight * 0.04, innerHeight * 0.16) * (1 - fit(w, innerWidth * 1.1, innerWidth * 1.6))
            el.style.visibility = f > 0.01 ? 'visible' : 'hidden'
            el.style.opacity = String(f)
            el.style.transform = `translate3d(${x - 500}px, ${y - 500 * (232 / 1283)}px, 0) scale(${w / 1000})`
          },
          font: getComputedStyle(root.current!).fontFamily,
          // the arrows: beside the ring's front screen, or inside, at the cards' middle
          onGallery: y => {
            if (arrows.current) arrows.current.style.top = `${current > 0.8 ? gridMid : y}px`
          },
          onPage: (_, n) => setPages(n),
          onReady: () => setState('ready'),
          onEnter: () => goRef.current(1),
          onFront: setFront,
          onOpen: i => { const c = deck[i]; if (c.external) location.href = c.href; else router.push(c.href) },
        })
        ;(window as unknown as { __showroom: SceneHandle }).__showroom = handle.current
        insets()
        if (viewRef.current) handle.current.setView(viewRef.current)
      } catch { setState('fallback') }
    })

    // a press anywhere else puts the keyboard and the panels away
    const onDownOut = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.('.sr-cap')) return
      if (document.activeElement === input.current) input.current?.blur()
      setPanel(null)
    }
    addEventListener('pointerdown', onDownOut)
    addEventListener('wheel', onWheel, { passive: false })
    addEventListener('touchstart', onTouchStart, { passive: true })
    addEventListener('touchmove', onTouchMove, { passive: false })
    addEventListener('touchend', onTouchEnd)
    addEventListener('keydown', onKey)
    addEventListener('resize', onResize)
    addEventListener('orientationchange', onResize)
    visualViewport?.addEventListener('resize', onResize)
    addEventListener('pointermove', onPointer, { passive: true })
    raf = requestAnimationFrame(frame)
    return () => {
      alive = false; cancelAnimationFrame(raf)
      removeEventListener('wheel', onWheel); removeEventListener('touchstart', onTouchStart); removeEventListener('touchmove', onTouchMove)
      removeEventListener('touchend', onTouchEnd); removeEventListener('keydown', onKey)
      removeEventListener('resize', onResize); removeEventListener('orientationchange', onResize); visualViewport?.removeEventListener('resize', onResize)
      removeEventListener('pointermove', onPointer); removeEventListener('pointerdown', onDownOut)
      handle.current?.dispose(); handle.current = null
    }
  }, [deck, router])

  return (
    <div ref={root} className="sr" data-state={state}>
      {/* Safari 26 looks at what is fixed at the very top edge to decide what to draw
          behind the clock; a transparent, click-through strip there lets the page show */}
      <div ref={strip} className="sr-safari-strip" aria-hidden="true" />
      <div className="sr-track">
        <div className="sr-stage">
          <canvas ref={canvas} className="sr-canvas" aria-label="אולם התצוגה של בוואריאן מוטורס" role="img" />

          {/* the frame rides on the stone; the letters inside come on: a little
              small and dim first, then grown to full size and full light */}
          <div ref={sign} className="sr-sign" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="sr-sign-img" src="/brand/logo-wide-light.png" alt="" width={1000} height={181} />
          </div>

          {/* The site's bar, in the hall's dark: menu at the start, the long logo at the end */}
          <header ref={nav} className="sr-top">
            <button type="button" className="sr-burger" aria-label={menu ? 'סגירת התפריט' : 'תפריט'} aria-expanded={menu} aria-controls="sr-menu" onClick={() => setMenu(m => !m)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {menu
                  ? <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  : <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
              </svg>
            </button>
            <Link href="/" className="sr-logo" aria-label="בוואריאן מוטורס">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-wide-light.png" alt="" width={1283} height={232} />
            </Link>
          </header>

          {/* the menu: the site's pages */}
          <nav id="sr-menu" className="sr-menu" data-open={menu} aria-label="ניווט ראשי" hidden={!menu}>
            <Link href="/cars" onClick={() => setMenu(false)}>הרכבים</Link>
            <Link href="/sold" onClick={() => setMenu(false)}>רכבים שנמכרו</Link>
            <Link href="/team" onClick={() => setMenu(false)}>הצוות</Link>
            <Link href="/contact" onClick={() => setMenu(false)}>צרו קשר</Link>
          </nav>

          {/* On the street, over the pavement: the way in and the site's other doors.
              "כל הרכבים" walks you into the hall, where the cars are. */}
          <div ref={floor} className="sr-floor">
            {/* only the way in hovers; the line of words below stays put */}
            <div className="sr-hover">
              <button type="button" className="sr-enter" onClick={() => goRef.current(1)}>
                כל הרכבים
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            {/* one line of the site's other doors: the pages, then the hall's channels */}
            <div className="sr-line">
            <nav className="sr-doors" aria-label="עמודי האתר">
              <Link href="/sold">רכבים שנמכרו</Link>
              <Link href="/team">הצוות</Link>
              <Link href="/contact">צרו קשר</Link>
            </nav>
            <div className="sr-social">
              {/* white line marks from one family, the same size and weight, lit like the rest of the street */}
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label="וואטסאפ">
                {/* a touch smaller than Instagram's: its bubble spans more of the box than the square */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" />
                  <path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" />
                </svg>
              </a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="אינסטגרם">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="4" width="16" height="16" rx="4" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M16.5 7.5v.01" />
                </svg>
              </a>
              <a href={FACEBOOK} target="_blank" rel="noopener noreferrer" aria-label="פייסבוק">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3" />
                </svg>
              </a>
            </div>
            </div>
          </div>

          {/* the arrows stand beside the cards, at their middle (a phone swipes) */}
          <div ref={arrows} className="sr-arrows" data-few={pages < 2 || undefined}>
            <button type="button" className="sr-arrow" aria-label="הקודם" onClick={() => handle.current?.step(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" className="sr-arrow" aria-label="הבא" onClick={() => handle.current?.step(1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>

          {/* The foot of the hall: one line of lit words (the makers or models
              to pick from, the filter, the order) over the search row */}
          <div ref={cap} className="sr-cap">
            {listOpen ? (
              <div className="sr-words" role="listbox" aria-label={stage === 'make' ? 'יצרנים' : 'דגמים'}>
                {items.map((r, i) => (
                  <button key={r.opt.key || '*'} type="button" role="option" aria-selected={i === active} className="sr-word"
                    style={{ '--i': Math.min(i, 10) } as React.CSSProperties} onPointerDown={onPd} onClick={() => pick(r.opt)}>
                    <bdi>{mark(r)}</bdi><small>{r.opt.count}</small>
                  </button>
                ))}
              </div>
            ) : panel === 'filter' ? (
              <div className="sr-words" role="group" aria-label="סינון">
                {AVAIL.map(([k, l], i) => (
                  <button key={k} type="button" className="sr-word" aria-pressed={avail === k} style={{ '--i': i } as React.CSSProperties} onClick={() => setAvail(k)}>{l}</button>
                ))}
                <span className="sr-words-gap" aria-hidden="true" />
                <button type="button" className="sr-word" aria-pressed={price < 0} style={{ '--i': 3 } as React.CSSProperties} onClick={() => setPrice(-1)}>כל המחירים</button>
                {PRICES.map((b, i) => (
                  <button key={b.label} type="button" className="sr-word" aria-pressed={price === i} style={{ '--i': 4 + i } as React.CSSProperties} onClick={() => setPrice(i)}>{b.label}</button>
                ))}
              </div>
            ) : panel === 'sort' ? (
              <div className="sr-words" role="group" aria-label="מיון">
                {SORTS.map(([k, l], i) => (
                  <button key={k} type="button" className="sr-word" aria-pressed={sort === k} style={{ '--i': i } as React.CSSProperties}
                    onClick={() => { setSort(k); setPanel(null) }}>{l}</button>
                ))}
              </div>
            ) : found && found.length === 0 ? (
              <div className="sr-words" role="status">
                <span className="sr-word sr-word-note">לא נמצאו רכבים</span>
                <button type="button" className="sr-word" onClick={clearAll}>נקה חיפוש</button>
              </div>
            ) : null}

            <div className="sr-row">
              {/* the field: what has been picked sits in it as chips, then the next step */}
              <form className="sr-find" role="search" data-picked={make ? '' : undefined} data-done={stage === 'done' ? '' : undefined}
                onSubmit={e => e.preventDefault()} onClick={() => input.current?.focus()}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {make && (
                  <button type="button" className="sr-chip" aria-label={`הסרת ${make}`} onPointerDown={onPd} onClick={e => { e.stopPropagation(); dropMake() }}>
                    <bdi>{make}</bdi>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
                  </button>
                )}
                {model && (
                  <button type="button" className="sr-chip" aria-label={`הסרת ${model}`} onPointerDown={onPd} onClick={e => { e.stopPropagation(); dropModel() }}>
                    <bdi>{model}</bdi>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
                  </button>
                )}
                <span className="sr-qwrap">
                  <input ref={input} className="sr-q" type="search" inputMode="search" enterKeyHint="search"
                    autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                    placeholder={stage === 'make' ? 'חיפוש לפי יצרן' : stage === 'model' ? 'בחרו דגם' : undefined}
                    aria-label={stage === 'make' ? 'חיפוש לפי יצרן' : 'חיפוש לפי דגם'} aria-expanded={listOpen} aria-autocomplete="list"
                    value={text} onChange={e => { if (model) setModel(null); setText(e.target.value) }}
                    onFocus={() => { setFocus(true); setPanel(null) }} onBlur={() => setFocus(false)} onKeyDown={onFieldKey} />
                  {/* empty and waiting: a lit caret says the field is open for typing */}
                  {stage !== 'done' && <span className="sr-caret" aria-hidden="true" />}
                </span>
                {found && <span className="sr-n" aria-live="polite">{carsWord(found.length)}</span>}
              </form>
              <button type="button" className="sr-tool" aria-label="סינון" aria-expanded={panel === 'filter'} data-on={filtersOn || undefined}
                onClick={() => { input.current?.blur(); setPanel(p => (p === 'filter' ? null : 'filter')) }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" />
                </svg>
              </button>
              <button type="button" className="sr-tool" aria-label="מיון" aria-expanded={panel === 'sort'} data-on={sort !== 'mix' || undefined}
                onClick={() => { input.current?.blur(); setPanel(p => (p === 'sort' ? null : 'sort')) }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 5v14M8 19l-3-3M8 19l3-3M16 19V5M16 5l-3 3M16 5l3 3" />
                </svg>
              </button>
            </div>
          </div>

          {/* for screen readers: the cars on show, as plain links (client only: the order is per visit) */}
          {state !== 'loading' && <ul className="sr-vh" aria-label="הרכבים">
            {(found ?? deck.map((_, i) => i)).map(i => (
              <li key={deck[i].href}><Link href={deck[i].href} tabIndex={-1}>{[deck[i].title, deck[i].sub].filter(Boolean).join(' · ')}</Link></li>
            ))}
          </ul>}

          <div className="sr-progress" aria-hidden="true"><div ref={bar} /></div>
          {state === 'fallback' && (
            <div className="sr-fallback">
              <p>האולם התלת-ממדי לא נתמך במכשיר הזה.</p>
              <Link href="/cars" className="sr-cta">לכל הרכבים</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
