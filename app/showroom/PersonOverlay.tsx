'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import PersonView, { type PersonData } from '../team/PersonView'

type Rect = { x: number; y: number; w: number; h: number; r: number }

// A team card opened in the hall: the person's page, opening out of the card
// itself. The portrait starts exactly where the card's photo is on screen and
// grows into its place on the page (transform + clip-path, top-anchored like
// the card), the page's light comes up under it, then the name and the ways to
// talk follow. Closing plays it back into the card. Nothing is fetched: the
// card already carries the person.
const OPEN_MS = 560, CLOSE_MS = 420
const EASE_OUT = 'cubic-bezier(.22,1,.36,1)', EASE_IO = 'cubic-bezier(.77,0,.175,1)'

// from the photo's place on the page back to the card's: scale to cover the
// card, cut to it (sides evenly, the bottom — both are anchored at the top)
function fromCard(final: DOMRect, card: Rect) {
  const k = Math.max(card.w / final.width, card.h / final.height)
  const padX = (final.width - card.w / k) / 2
  const padB = final.height - card.h / k
  return {
    transform: `translate(${card.x - final.left - padX * k}px, ${card.y - final.top}px) scale(${k})`,
    clipPath: `inset(0px ${padX}px ${padB}px ${padX}px round ${card.r / k}px)`,
  }
}

export default function PersonOverlay({ p, from, closing, onClosed, onClose }: {
  p: PersonData
  /** where the card's photo was on screen when it was tapped (null: just fade) */
  from: () => Rect | null
  closing: boolean
  onClosed: () => void
  onClose: () => void
}) {
  const photo = useRef<HTMLDivElement>(null), hero = useRef<HTMLImageElement>(null)
  const bg = useRef<HTMLDivElement>(null), rest = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  const parts = () => [rest.current, ...Array.from(root.current?.querySelectorAll<HTMLElement>('.pv-rest') ?? [])].filter(Boolean) as HTMLElement[]

  // the sharp copy comes up over the card's copy as soon as it is there
  useEffect(() => {
    const h = hero.current
    if (!h) return
    const on = () => h.classList.add('is-in')
    if (h.complete && h.naturalWidth) on(); else h.addEventListener('load', on, { once: true })
  }, [])

  // open: before the first paint, so the card never shows a frame of the page
  useLayoutEffect(() => {
    const ph = photo.current, card = from()
    if (still() || !ph || !card) {
      root.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: EASE_OUT })
    } else {
      const start = fromCard(ph.getBoundingClientRect(), card)
      ph.animate([start, { transform: 'none', clipPath: 'inset(0px 0px 0px 0px round 24px)' }], { duration: OPEN_MS, easing: EASE_OUT })
      bg.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 340, easing: EASE_OUT })
      parts().forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
        { duration: 380, delay: 200 + i * 50, easing: EASE_OUT, fill: 'backwards' }))
    }
    root.current?.querySelector<HTMLElement>('.pv-close')?.focus({ preventScroll: true })
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  // close: the same move played back into the card
  useEffect(() => {
    if (!closing) return
    const ph = photo.current, card = from()
    let done = false
    const end = () => { if (!done) { done = true; onClosed() } }
    if (still() || !ph || !card) {
      const a = root.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: EASE_OUT, fill: 'forwards' })
      if (a) a.onfinish = end; else end()
      return
    }
    root.current?.querySelector('.pv-over')?.scrollTo({ top: 0 })
    parts().forEach(el => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: EASE_OUT, fill: 'forwards' }))
    bg.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 80, easing: EASE_OUT, fill: 'forwards' })
    const a = ph.animate([{ transform: 'none', clipPath: 'inset(0px 0px 0px 0px round 24px)' }, fromCard(ph.getBoundingClientRect(), card)],
      { duration: CLOSE_MS, easing: EASE_IO, fill: 'forwards' })
    a.onfinish = end
    const t = setTimeout(end, CLOSE_MS + 200)   // never left open if a frame is dropped
    return () => clearTimeout(t)
  }, [closing])   // eslint-disable-line react-hooks/exhaustive-deps

  // Escape closes, like the button
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div ref={root} className="pv-host">
      <PersonView p={p} mode="over" onClose={onClose} refs={{ photo, hero, bg, rest }} />
    </div>
  )
}
