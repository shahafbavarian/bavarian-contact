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

// Internal preview (e.g. opening a car from the admin dashboard with ?notrack=1)
// must not pollute the stats. Once seen, remember it for the whole tab session
// so every later action on that visit is skipped too — not just the first.
function trackingDisabled(): boolean {
  try {
    if (sessionStorage.getItem('bav_notrack') === '1') return true
    if (new URLSearchParams(window.location.search).get('notrack') === '1') {
      sessionStorage.setItem('bav_notrack', '1')
      return true
    }
  } catch {}
  return false
}

export function track(
  type: TrackType,
  opts: { recNo?: string | null; source?: string | null } = {},
): void {
  if (typeof window === 'undefined') return
  if (trackingDisabled()) return
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
