'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { he as t } from './strings'

// The site header. Logo (the full original mark) at the start, the two section
// links at the end; on a person page the logo yields its spot to a back link
// and moves to the end. iOS-style large title: the bar is clear while the
// page's big heading is on screen, and frosts carrying the title once it
// scrolls away. `watch` is the id of that heading; without it the bar frosts
// after any scroll.
export default function TopBar({ title, watch, back }: { title: string; watch?: string; back?: boolean }) {
  const bar = useRef<HTMLElement>(null)
  const pathname = usePathname()

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

  const logo = (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="bm-logo" src="/brand/logo-full-dark-sm.png" alt={t.logoAlt} width={94} height={44} />
  )

  // like a native app's bar: a tap on its empty part goes back to the top
  // (the iPhone's tap-on-the-clock, which some setups miss, gets a fallback)
  const toTop = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('a, button')) return
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  return (
    <header ref={bar} className="bm-bar" data-scrolled="false" onClick={toTop}>
      {back ? (
        <>
          <Link href="/team" className="bm-back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t.backToTeam}
          </Link>
          <span className="bm-bar-title" aria-hidden="true">{title}</span>
          <Link href="/" className="bm-logo-link bm-logo-end" aria-label={t.brand}>{logo}</Link>
        </>
      ) : (
        <>
          <Link href="/" className="bm-logo-link" aria-label={t.brand}>{logo}</Link>
          {/* The nav already names the page; no duplicate centered title here. */}
          <span />
          <nav className="bm-nav" aria-label={t.navLabel}>
            <Link href="/cars" aria-current={pathname === '/cars' ? 'page' : undefined}>{t.navCars}</Link>
            <Link href="/team" aria-current={pathname?.startsWith('/team') ? 'page' : undefined}>{t.navTeam}</Link>
          </nav>
        </>
      )}
    </header>
  )
}
