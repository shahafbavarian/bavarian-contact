import { NextResponse } from 'next/server'

// One-time helper: discover Fireberry picklist codes
// GET /api/admin/fireberry-fields
export async function GET() {
  const key = process.env.FIREBERRY_API_KEY
  if (!key) return NextResponse.json({ error: 'FIREBERRY_API_KEY not set' }, { status: 500 })

  const headers = { tokenId: key, 'Content-Type': 'application/json' }

  // Try multiple Fireberry picklist endpoint patterns
  const attempts = await Promise.allSettled([
    fetch('https://api.powerlink.co.il/api/query/picklist', {
      method: 'POST',
      headers,
      body: JSON.stringify({ objecttype: 1, fieldname: 'originatingleadcod' }),
    }).then(r => r.json()),

    fetch('https://api.powerlink.co.il/api/query/picklist', {
      method: 'POST',
      headers,
      body: JSON.stringify({ objecttype: '1', fieldname: 'originatingleadcod' }),
    }).then(r => r.json()),

    fetch('https://api.powerlink.co.il/api/picklist/1/originatingleadcod', {
      method: 'GET', headers,
    }).then(r => r.json()),

    fetch('https://api.powerlink.co.il/api/objecttype/1/fields', {
      method: 'GET', headers,
    }).then(r => r.json()),
  ])

  return NextResponse.json(
    attempts.map((a, i) => ({
      attempt: i + 1,
      status: a.status,
      data: a.status === 'fulfilled' ? a.value : String((a as PromiseRejectedResult).reason),
    }))
  )
}
