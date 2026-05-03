import { NextResponse } from 'next/server'

// One-time helper: call this to discover Fireberry picklist codes
// GET /api/admin/fireberry-fields
export async function GET() {
  const key = process.env.FIREBERRY_API_KEY
  if (!key) return NextResponse.json({ error: 'FIREBERRY_API_KEY not set' }, { status: 500 })

  const res = await fetch(
    'https://api.powerlink.co.il/api/query/picklist?objecttype=1&fieldname=originatingleadcod',
    { headers: { tokenId: key } }
  )
  const data = await res.json()
  return NextResponse.json(data)
}
