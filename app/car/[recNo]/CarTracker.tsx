'use client'

import { useEffect, useRef } from 'react'
import { track } from '@/lib/track'

// Invisible tracker mounted on every car page. Fires:
//   • pageview  — for every visit (lets us count views per car)
//   • qr_scan   — only when the visit arrived via a QR code, which encodes
//                 ?src=slideshow / ?src=print so we can split the sources.
export default function CarTracker({ recNo }: { recNo: string }) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return // guard against React StrictMode double-invoke
    fired.current = true

    let src: string | null = null
    try {
      src = new URLSearchParams(window.location.search).get('src')
    } catch {}

    track('pageview', { recNo })
    if (src) track('qr_scan', { recNo, source: src })

    // Clean the tracking params from the URL (already consumed above): ?src so a
    // reload doesn't re-count a scan, ?notrack so an admin-shared link looks clean.
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.has('src') || params.has('notrack')) {
        params.delete('src')
        params.delete('notrack')
        const q = params.toString()
        window.history.replaceState({}, '', window.location.pathname + (q ? `?${q}` : ''))
      }
    } catch {}
  }, [recNo])

  return null
}
