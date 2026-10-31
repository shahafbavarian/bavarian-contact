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
  return { transform: `translate(${card.x - final.left}px, ${card.y - final.top}px) scale(${k})`, borderRadius: `${card.r / k}px` }
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

  // the rest of the car
  useEffect(() => {
    const ac = new AbortController()
    fetch(`/api/cars/${quick.recNo}`, { signal: ac.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.car) setFull({ car: d.car, qr: d.qr ?? '' }) })
      .catch(() => {})
    return () => ac.abort()
  }, [quick.recNo])

  // open: before the first paint, so the card never shows a frame of the page
  useLayoutEffect(() => {
    const ph = photo.current, card = from()
    if (still() || !ph || !card) {
      root()?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: EASE_OUT })
    } else {
      const fin = getComputedStyle(ph).borderRadius
      ph.animate([fromCard(ph.getBoundingClientRect(), card), { transform: 'none', borderRadius: fin }], { duration: OPEN_MS, easing: EASE_OUT })
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
      const cs = getComputedStyle(el), v = { opacity: cs.opacity, transform: cs.transform, borderRadius: cs.borderRadius }
      el.getAnimations().forEach(x => x.cancel())
      return v
    }
    const r = root()
    if (still() || !ph || !card) {
      const a = r?.animate([{ opacity: now(r).opacity }, { opacity: 0 }], { duration: 180, easing: EASE_OUT, fill: 'forwards' })
      if (a) a.onfinish = end; else end()
      return
    }
    // back to the top and to the first photo — the one on the card
    r?.scrollTo({ top: 0 })
    const tr = ph.querySelector<HTMLElement>('.cv-track')
    if (tr) tr.scrollTo({ left: 0 })
    const fade = [...parts(), ...Array.from(r?.querySelectorAll<HTMLElement>('.cv-page > :not(.cv-gallery):not(.cv-side), .cv-count') ?? [])]
    fade.forEach(el => {
      const v = now(el)
      el.animate([{ opacity: v.opacity, transform: v.transform }, { opacity: 0, transform: v.transform }], { duration: 140, easing: EASE_OUT, fill: 'forwards' })
    })
    if (bg.current) {
      const v = now(bg.current)
      bg.current.animate([{ opacity: v.opacity }, { opacity: 0 }], { duration: 300, delay: 80, easing: EASE_OUT, fill: 'forwards' })
    }
    const pv = now(ph)
    ph.animate([{ transform: pv.transform, borderRadius: pv.borderRadius }, fromCard(ph.getBoundingClientRect(), card)],
      { duration: CLOSE_MS, easing: EASE_IO, fill: 'forwards' })
    // the last stretch fades onto the card (already back in its place), and
    // the layer goes only once it is invisible
    const f = ph.animate([{ opacity: pv.opacity }, { opacity: 0 }], { duration: 140, delay: CLOSE_MS - 140, easing: 'linear', fill: 'forwards' })
    f.onfinish = () => requestAnimationFrame(end)
    const t = setTimeout(end, CLOSE_MS + 200)
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
      side = !!(e.target as Element | null)?.closest?.('.cv-track, .cv-thumbs, .cv-sheet, .cv-full')
    }
    const move = (e: TouchEvent) => {
      if (side) return
      const dy = e.touches[0].clientY - y0, dx = e.touches[0].clientX - x0
      if (e.cancelable && el.scrollTop <= 0 && dy > Math.abs(dx)) e.preventDefault()
    }
    const end = (e: TouchEvent) => {
      if (side || document.documentElement.hasAttribute('data-cv-lock')) return
      const dy = e.changedTouches[0].clientY - y0, dt = Math.max(1, performance.now() - t0)
      if (fromTop && dy > 110 && dy / dt > 0.6) closeRef.current()
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
