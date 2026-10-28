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
  created_at: string
  updated_at: string
}

// What the public pages need. Phone stays server-side except as a wa.me link.
export type PublicAgent = {
  publicId: string
  name: string
  title: string | null
  photoUrl: string | null
  whatsapp: string
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

export function initials(name: string): string {
  return name.split(/[\s\u05BE-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('')
}

export function toPublicAgent(a: Agent): PublicAgent {
  return {
    publicId: a.public_id,
    name: a.full_name,
    title: a.title,
    photoUrl: a.photo_url,
    whatsapp: whatsappLink(a.phone),
  }
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
