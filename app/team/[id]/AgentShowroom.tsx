'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { PublicAgent } from '@/lib/agent-format'
import { INSTAGRAM_URL } from '@/lib/agent-format'
import AgentMedia from '../AgentMedia'
import Room from '../Room'
import { FROM_TEAM_KEY } from '../keys'

type Mode = 'pre' | 'unveil' | 'enter'

export default function AgentShowroom({ agent }: { agent: PublicAgent }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>('pre')
  const [lightsOn, setLightsOn] = useState(false)
  const [textIn, setTextIn] = useState(false)

  // Walking in from the team page gets a short entrance; arriving directly
  // (QR, NFC, shared link) gets the full unveiling.
  useEffect(() => {
    let fromTeam = false
    try {
      fromTeam = sessionStorage.getItem(FROM_TEAM_KEY) === '1'
      sessionStorage.removeItem(FROM_TEAM_KEY)
    } catch {}
    const timers: ReturnType<typeof setTimeout>[] = []
    if (fromTeam) {
      setMode('enter')
      setLightsOn(true)
      timers.push(setTimeout(() => setTextIn(true), 160))
    } else {
      setMode('unveil')
      timers.push(setTimeout(() => setLightsOn(true), 60))
      timers.push(setTimeout(() => setTextIn(true), 1000))
    }
    return () => timers.forEach(clearTimeout)
  }, [])

  // The floor line sits at the photo's feet.
  useEffect(() => {
    const place = () => {
      const r = heroRef.current?.getBoundingClientRect()
      if (r) rootRef.current?.style.setProperty('--hz', `${r.bottom}px`)
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [])

  // The photo turns toward a mouse; on touch it can be nudged and springs back.
  useEffect(() => {
    const hero = heroRef.current
    if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const wrap = hero.parentElement!
    let rx = 0, ry = 0, tx = 0, ty = 0, raf = 0, running = false
    const loop = () => {
      rx += (tx - rx) * 0.12
      ry += (ty - ry) * 0.12
      // Leave the element alone while its entrance animation is still running.
      if (hero.getAnimations().length === 0) hero.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`
      if (Math.abs(tx - rx) > 0.01 || Math.abs(ty - ry) > 0.01) raf = requestAnimationFrame(loop)
      else running = false
    }
    const kick = () => { if (!running) { running = true; raf = requestAnimationFrame(loop) } }
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
    const cleanups: (() => void)[] = []
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, ev: K, fn: (e: HTMLElementEventMap[K]) => void) => {
      el.addEventListener(ev, fn)
      cleanups.push(() => el.removeEventListener(ev, fn))
    }

    if (fine) {
      on(wrap, 'pointermove', e => {
        const r = hero.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
        ty = Math.max(-8, Math.min(8, (px - 0.5) * 16))
        tx = Math.max(-6, Math.min(6, -(py - 0.5) * 12))
        hero.style.setProperty('--lx', `${px * 100}%`)
        hero.style.setProperty('--ly', `${py * 100}%`)
        kick()
      })
      on(wrap, 'pointerleave', () => { tx = 0; ty = 0; kick() })
    } else {
      let id: number | null = null, x0 = 0, y0 = 0
      on(hero, 'pointerdown', e => { id = e.pointerId; hero.setPointerCapture(id); x0 = e.clientX; y0 = e.clientY })
      on(hero, 'pointermove', e => {
        if (e.pointerId !== id) return
        ty = Math.max(-22, Math.min(22, (e.clientX - x0) * 0.12))
        tx = Math.max(-14, Math.min(14, -(e.clientY - y0) * 0.08))
        kick()
      })
      const release = () => { id = null; tx = 0; ty = 0; kick() }
      on(hero, 'pointerup', release)
      on(hero, 'pointercancel', release)
    }
    return () => { cancelAnimationFrame(raf); cleanups.forEach(f => f()) }
  }, [])

  const cls = ['sr', `sr-${mode}`, lightsOn && 'sr-on', textIn && 'sr-in'].filter(Boolean).join(' ')

  return (
    <div ref={rootRef} className={cls}>
      <noscript><style>{'.sr-pre .sr-hero,.sr-pre .sr-stagger{opacity:1!important;transform:none!important}'}</style></noscript>
      <Room />
      <main className="sr-view">
        <div className="sr-topbar">
          <Link href="/team" className="sr-round" aria-label="לכל הצוות" style={{ width: 44, height: 44 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sr-logo" src="/LOGO.webp" alt="Bavarian Motors" />
          <span style={{ width: 44 }} />
        </div>

        <div className="sr-agent-body">
          <div className="sr-hero-wrap">
            <div ref={heroRef} className="sr-hero" style={{ touchAction: 'none' }}>
              <AgentMedia name={agent.name} photoUrl={agent.photoUrl} eager />
              <div className="sr-hero-gloss" />
              <div className="sr-flash" />
              <div className="sr-cover" />
            </div>
            <div className="sr-hero-shadow" />
          </div>

          <div className="sr-agent-side">
            <div className="sr-info sr-stagger" style={{ '--d': '0ms' } as React.CSSProperties}>
              <span className="sr-label">Bavarian Motors · Advisor</span>
              <h1 className="sr-name">{agent.name}</h1>
              {agent.title && <div className="sr-title">{agent.title}</div>}
            </div>

            <div className="sr-actions">
              <a className="sr-btn sr-btn-primary sr-stagger" style={{ '--d': '60ms' } as React.CSSProperties}
                href={agent.whatsapp} target="_blank" rel="noopener noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1112 21.8zM12 0a12 12 0 00-10.3 18L0 24l6.2-1.6A12 12 0 1012 0z" />
                </svg>
                שיחה ב-WhatsApp
              </a>
              <a className="sr-btn sr-btn-ghost sr-stagger" style={{ '--d': '120ms' } as React.CSSProperties}
                href={`/api/agents/${agent.publicId}/vcard`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M19 3v5M16.5 5.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                שמור איש קשר
              </a>
              <a className="sr-btn sr-btn-ghost sr-stagger" style={{ '--d': '180ms' } as React.CSSProperties}
                href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="17.4" cy="6.6" r="1" fill="currentColor" />
                </svg>
                Instagram
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
