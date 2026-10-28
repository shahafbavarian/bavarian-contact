'use client'

import { useEffect, useRef } from 'react'

// Uncovers each [data-reveal] child once, as it scrolls into view. The hidden
// starting state only applies after this runs (data-reveal-ready), so without
// JavaScript — or before hydration — every card is simply visible.
export default function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const root = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el || !('IntersectionObserver' in window)) return
    const items = Array.from(el.querySelectorAll<HTMLElement>('[data-reveal]'))
    // Cards already on screen at load are revealed together, row by row.
    const io = new IntersectionObserver(entries => {
      let n = 0
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const item = e.target as HTMLElement
        item.style.setProperty('--d', `${Math.min(n++, 5) * 60}ms`)
        item.classList.add('is-in')
        io.unobserve(item)
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 })
    el.setAttribute('data-reveal-ready', '')
    items.forEach(i => io.observe(i))
    return () => io.disconnect()
  }, [])

  return <ul ref={root} className={className}>{children}</ul>
}
