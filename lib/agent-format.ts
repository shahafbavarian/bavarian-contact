// Pure agent helpers — no server imports, safe to use from client components.

export type Agent = {
  id: string
  public_id: string
  full_name: string
  phone: string
  email: string | null
  title: string | null
  photo_path: string | null
  photo_url: string | null
  active: boolean
  sort_order: number
  source_rec_no: number | null
  created_at: string
  updated_at: string
}

export const INSTAGRAM_URL = 'https://www.instagram.com/bavarianmotors'
export const SITE_URL = 'https://contact.bavarian-motors.co.il'

// Accepts 050-1234567, 0501234567, +972501234567, 972-50-123-4567.
// Returns the local form "0501234567", or null when it isn't an Israeli mobile.
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, '')
  if (d.startsWith('972')) d = '0' + d.slice(3)
  return /^05\d{8}$/.test(d) ? d : null
}

export function toInternational(localPhone: string): string {
  return '972' + localPhone.slice(1)
}

export function whatsappLink(localPhone: string): string {
  return `https://wa.me/${toInternational(localPhone)}`
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

// First letter of the first and the last name ("שירה בן־דוד אלמוג" → "שא").
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const first = Array.from(words[0])[0]
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : ''
  return first + last
}

function vEscape(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

// vCard 3.0, UTF-8, CRLF — the most widely accepted combination on iOS and
// Android. Name and phone are required; email and title only when set.
export function buildVCard(a: Pick<Agent, 'full_name' | 'phone' | 'email' | 'title'>): string {
  const parts = a.full_name.trim().split(/\s+/)
  const family = parts.length > 1 ? parts[parts.length - 1] : ''
  const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0]
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${vEscape(family)};${vEscape(given)};;;`,
    `FN:${vEscape(a.full_name.trim())}`,
    'ORG:Bavarian Motors',
    a.title ? `TITLE:${vEscape(a.title)}` : null,
    `TEL;TYPE=CELL,VOICE:+${toInternational(a.phone)}`,
    a.email ? `EMAIL;TYPE=INTERNET:${vEscape(a.email)}` : null,
    'END:VCARD',
  ]
  return lines.filter(Boolean).join('\r\n') + '\r\n'
}
