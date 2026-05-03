const FIREBERRY_API = 'https://api.powerlink.co.il/api'

// utm_source → originatingleadcode
// 27 = פורטל ביטוחי, 28 = דף נחיתה 2026 (ישיר)
const SOURCE_CODE_MAP: Record<string, number> = {
  'ins-portal': 27,
}
const DEFAULT_SOURCE_CODE = 28 // ביקור ישיר ללא utm

const SOURCE_LABEL_MAP: Record<string, string> = {
  'ins-portal': 'פורטל ביטוחי',
}

export async function pushLeadToFireberry(lead: {
  name: string | null
  phone: string
  message: string | null
  utm_source: string | null
}): Promise<void> {
  const key = process.env.FIREBERRY_API_KEY
  if (!key) return

  const noteLines: string[] = []
  const sourceLabel = lead.utm_source ? SOURCE_LABEL_MAP[lead.utm_source] : null
  if (sourceLabel) noteLines.push(`מקור הגעה: ${sourceLabel}`)
  if (lead.message?.trim()) noteLines.push(`הודעה: ${lead.message.trim()}`)

  const sourceCode = lead.utm_source
    ? (SOURCE_CODE_MAP[lead.utm_source] ?? DEFAULT_SOURCE_CODE)
    : DEFAULT_SOURCE_CODE

  const payload: Record<string, unknown> = {
    accountname: lead.name?.trim() || 'ללא שם',
    mobilephone: lead.phone.trim(),
    originatingleadcode: sourceCode,
  }

  if (noteLines.length > 0) {
    payload.description = noteLines.join('\n')
  }

  const res = await fetch(`${FIREBERRY_API}/record/1`, {
    method: 'POST',
    headers: { tokenId: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Fireberry ${res.status}: ${text}`)
  }
}
