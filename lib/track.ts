// Lightweight client-side event tracker. Uses navigator.sendBeacon so the
// event still fires even when the click immediately navigates away (e.g.
// WhatsApp / tel links). Never throws — tracking must never break the UX.

export type TrackType =
  | 'pageview'    // any car-page visit
  | 'qr_scan'     // visit that arrived via a QR code (source = slideshow/print)
  | 'wa_click'    // WhatsApp button
  | 'phone_click' // phone/call button
  | 'share'       // share button (source = images/link)
  | 'form_open'   // "leave details" form opened (intent)
  | 'video_view'  // reached a car's video screen (source = video index)

function detectDevice(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  return window.innerWidth < 1024 ? 'mobile' : 'desktop'
}

export function track(
  type: TrackType,
  opts: { recNo?: string | null; source?: string | null } = {},
): void {
  if (typeof window === 'undefined') return
  try {
    const payload = JSON.stringify({
      type,
      device: detectDevice(),
      rec_no: opts.recNo ?? null,
      utm_source: opts.source ?? null,
    })
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }))
    } else {
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    /* swallow — never let analytics break the page */
  }
}
