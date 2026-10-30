'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { initials } from '@/lib/agent-format'
import { he as t } from '../team/strings'

// A person opened from the hall: their page laid over it, at their own address
// (/team/<id>), while the hall stays alive behind. Closing is a step back, so
// the browser's back button closes it too. Its own styles (showroom.css): the
// team page's stylesheet unlocks the page for scrolling and would break the hall
export default function PersonSheet({ name, role, photo, whatsapp, vcard, instagram }: {
  name: string; role: string | null; photo: string | null; whatsapp: string; vcard: string; instagram: string
}) {
  const router = useRouter()
  const closeBtn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeBtn.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') router.back() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [router])

  return (
    <div className="sr-sheet" role="dialog" aria-modal="true" aria-label={name}>
      <div className="sr-sheet-in">
        <button ref={closeBtn} type="button" className="sr-sheet-close" aria-label="סגירה" onClick={() => router.back()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <div className="sr-sheet-photo">
          {photo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={photo} alt="" draggable={false} decoding="async" />
            : <div className="sr-sheet-mono" aria-hidden="true">{initials(name)}</div>}
        </div>
        <h1 className="sr-sheet-name">{name}</h1>
        {role && <p className="sr-sheet-role">{role}</p>}
        <div className="sr-sheet-actions">
          <a className="sr-sheet-btn sr-sheet-primary" href={whatsapp} target="_blank" rel="noopener noreferrer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1112 21.8zM12 0a12 12 0 00-10.3 18L0 24l6.2-1.6A12 12 0 1012 0z" />
            </svg>
            {t.whatsapp}
          </a>
          <a className="sr-sheet-btn" href={vcard}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M19 3v5M16.5 5.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {t.saveContact}
          </a>
          <a className="sr-sheet-btn" href={instagram} target="_blank" rel="noopener noreferrer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="17.4" cy="6.6" r="1" fill="currentColor" />
            </svg>
            {t.instagram}
          </a>
        </div>
      </div>
    </div>
  )
}
