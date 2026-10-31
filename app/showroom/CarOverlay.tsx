'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import CarView from '../cars/[slug]/CarView'
import type { PublicCar } from '@/lib/car-public'

type Rect = { x: number; y: number; w: number; h: number; r: number }

// A car card opened in the hall: the car's page, opening out of the card
// itself — the same motion as a person's (PersonOverlay). The card's photo is
// 3:2 and so is the page's main photo: it starts exactly where the card's
// photo is on screen and grows into its place (transform only, on the
// compositor), the page's light comes up under it, then the bar, the name and
// the price, and the ways to talk follow. Closing plays it back into the card.
// The card already carries the photo, the name and the price; the rest of the
// car (its spec, offer, indices…) comes from /api/cars/<number> and rises in
// below as soon as it is there.
const OPEN_MS = 560, CLOSE_MS = 420
const EASE_OUT = 'cubic-bezier(.22,1,.36,1)', EASE_IO = 'cubic-bezier(.77,0,.175,1)'

function fromCard(final: DOMRect, card: Rect) {
  const k = card.w / final.width
  return { transform: `translate(${card.x - final.left}px, ${card.y - final.top}px) scale(${k})` }
}

export default function CarOverlay({ quick, url, from, closing, onClosed, onClose }: {
  /** what the card already carries: shown at once */
  quick: PublicCar
  url: string
  /** where the card's photo was on screen when it was tapped (null: just fade) */
  from: () => Rect | null
  closing: boolean
  onClosed: () => void
  onClose: () => void
}) {
  const [full, setFull] = useState<{ car: PublicCar; qr: string } | null>(null)
  const photo = useRef<HTMLDivElement>(null), bg = useRef<HTMLDivElement>(null), host = useRef<HTMLDivElement>(null)
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  const root = () => host.current?.querySelector<HTMLElement>('.cv-over') ?? null
  const parts = () => Array.from(host.current?.querySelectorAll<HTMLElement>('.cv-rest') ?? [])
  // in flight, the photo is the cover alone (the gallery under it stays put)
  // and its own layer; nothing else in the page is rebuilt meanwhile
  const flying = (on: boolean) => {
    const ph = photo.current; if (!ph) return
    ph.toggleAttribute('data-flying', on)
    ph.style.willChange = on ? 'transform' : ''
  }
  const opened = useRef(performance.now())
  const closingRef = useRef(closing)
  closingRef.current = closing

  // the rest of the car
  useEffect(() => {
    const ac = new AbortController()
    fetch(`/api/cars/${quick.recNo}`, { signal: ac.signal })
      .then(r => (r.ok ? r.json() : null))
      // the rest of the page comes in once the opening has landed — a page
      // rebuilt under a moving photo is what made it stutter
      .then(d => {
        if (!d?.car) return
        const wait = Math.max(0, OPEN_MS + 60 - (performance.now() - opened.current))
        setTimeout(() => { if (!closingRef.current) setFull({ car: d.car, qr: d.qr ?? '' }) }, wait)
      })
      .catch(() => {})
    return () => ac.abort()
  }, [quick.recNo])

  // open: before the first paint, so the card never shows a frame of the page
  useLayoutEffect(() => {
    const ph = photo.current, card = from()
    if (still() || !ph || !card) {
      root()?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: EASE_OUT })
    } else {
      flying(true)
      const a = ph.animate([fromCard(ph.getBoundingClientRect(), card), { transform: 'none' }], { duration: OPEN_MS, easing: EASE_OUT })
      a.onfinish = () => flying(false)
      bg.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 340, easing: EASE_OUT })
      parts().forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
        { duration: 380, delay: 200 + i * 50, easing: EASE_OUT, fill: 'backwards' }))
    }
    if (matchMedia('(pointer: fine)').matches) root()?.querySelector<HTMLElement>('.cv-close')?.focus({ preventScroll: true })
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  // close: the same move played back into the card
  useEffect(() => {
    if (!closing) return
    const ph = photo.current, card = from()
    let done = false
    const end = () => { if (!done) { done = true; onClosed() } }
    // a close during the opening goes on from exactly where each piece is
    const now = (el: HTMLElement) => {
      const cs = getComputedStyle(el), v = { opacity: cs.opacity, transform: cs.transform }
      el.getAnimations().forEach(x => x.cancel())
      return v
    }
    const r = root()
    if (still() || !ph || !card) {
      const a = r?.animate([{ opacity: now(r).opacity }, { opacity: 0 }], { duration: 180, easing: EASE_OUT, fill: 'forwards' })
      if (a) a.onfinish = end; else end()
      return
    }
    // In order, as one breath: the details go first — all of the page but
    // the photo fades — then the photo flies home into its card while the
    // page's light goes, and the last stretch fades onto the card. No jump to
    // the top: the photo flies from wherever it is on the screen (out of
    // view, it comes in as it flies)
    const HEAD = 140
    ph.setAttribute('data-closing', '')   // the cover — the card's own photo — over the gallery
    const fade = [...parts(), ...Array.from(r?.querySelectorAll<HTMLElement>('.cv-page > :not(.cv-gallery):not(.cv-side), .cv-count') ?? [])]
    fade.forEach(el => {
      const v = now(el)
      el.animate([{ opacity: v.opacity, transform: v.transform }, { opacity: 0, transform: v.transform }], { duration: 160, easing: EASE_OUT, fill: 'forwards' })
    })
    if (bg.current) {
      const v = now(bg.current)
      bg.current.animate([{ opacity: v.opacity }, { opacity: 0 }], { duration: 320, delay: HEAD + 60, easing: EASE_OUT, fill: 'forwards' })
    }
    const pv = now(ph)
    const at = ph.getBoundingClientRect()
    flying(true)
    ph.animate([{ transform: pv.transform }, fromCard(at, card)], { duration: CLOSE_MS, delay: HEAD, easing: EASE_IO, fill: 'both' })
    if (at.bottom < 0 || at.top > innerHeight) ph.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay: HEAD, easing: 'linear', fill: 'backwards' })
    // the last stretch fades onto the card (already back in its place), and
    // the layer goes only once it is invisible
    const f = ph.animate([{ opacity: pv.opacity }, { opacity: 0 }], { duration: 140, delay: HEAD + CLOSE_MS - 140, easing: 'linear', fill: 'forwards' })
    f.onfinish = () => requestAnimationFrame(end)
    const t = setTimeout(end, HEAD + CLOSE_MS + 200)
    return () => clearTimeout(t)
  }, [closing])   // eslint-disable-line react-hooks/exhaustive-deps

  // Pulling down never reloads the page; a strong swipe down — far and fast —
  // from the top closes the car. Sideways (the gallery) is left alone
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const el = root()
    if (!el) return
    let y0 = 0, x0 = 0, t0 = 0, fromTop = true, side = false
    const start = (e: TouchEvent) => {
      y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; t0 = performance.now(); fromTop = el.scrollTop <= 0
      // (the photo and the strip too: a swipe down from the top closes from anywhere, as on a person)
      side = !!(e.target as Element | null)?.closest?.('.cv-sheet, .cv-full')
    }
    const move = (e: TouchEvent) => {
      if (side) return
      const dy = e.touches[0].clientY - y0, dx = e.touches[0].clientX - x0
      if (e.cancelable && el.scrollTop <= 0 && dy > Math.abs(dx)) e.preventDefault()
    }
    const end = (e: TouchEvent) => {
      if (side || document.documentElement.hasAttribute('data-cv-lock')) return
      const dy = e.changedTouches[0].clientY - y0, dt = Math.max(1, performance.now() - t0)
      const dx = Math.abs(e.changedTouches[0].clientX - x0)
      if (fromTop && dy > 110 && dy > dx * 1.5 && dy / dt > 0.6) closeRef.current()
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    return () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchmove', move); el.removeEventListener('touchend', end) }
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  // Escape closes — once nothing of the page's own (a sheet, the full screen) is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('.cv-sheet[data-open], .cv-full')) return
      onClose()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  const car = full?.car ?? quick
  return (
    <div ref={host} className="cv-host">
      <CarView car={car} url={url} qr={full?.qr ?? ''} mode="over" loading={!full} onClose={onClose} refs={{ photo, bg }} />
    </div>
  )
}
