import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const key = process.env.FIREBERRY_API_KEY
  if (!key) return NextResponse.json({ error: 'FIREBERRY_API_KEY not set' }, { status: 500 })

  const payload = {
    accountname: 'בדיקה - מחק',
    telephone1: '0500000000',
    originatingleadcode: 27,
    description: 'מקור הגעה: פורטל ביטוחי\nהודעה: בדיקה טכנית',
  }

  const res = await fetch('https://api.powerlink.co.il/api/record/1', {
    method: 'POST',
    headers: { tokenId: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  let json: unknown
  try { json = JSON.parse(text) } catch { json = text }

  return NextResponse.json({
    status: res.status,
    ok: res.ok,
    payload,
    response: json,
  })
}
