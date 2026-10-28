'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { he as t } from './strings'

// iOS-style large title: the bar is clear while the page's big heading is on
// screen, and turns into a frosted bar carrying the title once it scrolls away.
// `watch` is the id of that heading; without it the bar frosts after any scroll.
export default function TopBar({ title, watch, back }: { title: string; watch?: string; back?: boolean }) {
  const bar = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = bar.current
    if (!el) return
    const target = watch ? document.getElementById(watch) : null
    if (target) {
      const io = new IntersectionObserver(([e]) => { el.dataset.scrolled = String(!e.isIntersecting) }, { rootMargin: '-56px 0px 0px 0px' })
      io.observe(target)
      return () => io.disconnect()
    }
    const onScroll = () => { el.dataset.scrolled = String(window.scrollY > 8) }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [watch])

  return (
    <header ref={bar} className="bm-bar" data-scrolled="false">
      {back ? (
        <Link href="/team" className="bm-back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t.backToTeam}
        </Link>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="bm-logo" src="/brand/logo-compact-dark-sm.png" alt={t.logoAlt} width={92} height={34} />
      )}
      <span className="bm-bar-title" aria-hidden="true">{title}</span>
      <span />
    </header>
  )
}
