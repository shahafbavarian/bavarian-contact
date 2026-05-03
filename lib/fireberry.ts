const FIREBERRY_API = 'https://api.powerlink.co.il/api'

// Map utm_source → Fireberry picklist code for "מקור הגעה"
// To find codes: GET /api/admin/fireberry-fields after deployment
const SOURCE_CODE_MAP: Record<string, number> = {
  // 'ins-portal': 123,  ← fill in after running /api/admin/fireberry-fields
}

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

  const payload: Record<string, unknown> = {
    accountname: lead.name?.trim() || 'ללא שם',
    mobilephone: lead.phone.trim(),
  }

  if (noteLines.length > 0) {
    payload.description = noteLines.join('\n')
  }

  const sourceCode = lead.utm_source ? SOURCE_CODE_MAP[lead.utm_source] : undefined
  if (sourceCode !== undefined) {
    payload.originatingleadcode = sourceCode
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
