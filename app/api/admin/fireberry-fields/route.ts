import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const key = process.env.FIREBERRY_API_KEY
  if (!key) return NextResponse.json({ error: 'FIREBERRY_API_KEY not set' }, { status: 500 })

  const headers = { tokenId: key, 'Content-Type': 'application/json' }

  // Step 1: get field metadata to find the picklist system ID
  const metaRes = await fetch('https://api.powerlink.co.il/api/query/picklist', {
    method: 'POST',
    headers,
    body: JSON.stringify({ objecttype: 1, fieldname: 'originatinglead' }),
  })
  const meta = await metaRes.json().catch(() => ({}))

  // Extract any picklist/ref ID from the field definition
  const fieldDef = Array.isArray(meta?.data?.Data)
    ? meta.data.Data.find((f: Record<string, unknown>) => f.fieldname === 'originatinglead')
    : null

  // Step 2: try known patterns for fetching dropdown values
  const picklistId = fieldDef?.picklistid ?? fieldDef?.refobjecttype ?? null

  const valueAttempts = await Promise.allSettled([
    // Pattern A: /api/picklist/{objecttype}/{fieldname}
    fetch(`https://api.powerlink.co.il/api/picklist/1/originatinglead`, { headers }).then(r => r.json()),

    // Pattern B: /api/dropdown/{objecttype}/{fieldname}
    fetch(`https://api.powerlink.co.il/api/dropdown/1/originatinglead`, { headers }).then(r => r.json()),

    // Pattern C: picklist by discovered ID (if found)
    picklistId
      ? fetch(`https://api.powerlink.co.il/api/picklist/${picklistId}`, { headers }).then(r => r.json())
      : Promise.reject('no picklistId'),

    // Pattern D: query picklist values specifically
    fetch('https://api.powerlink.co.il/api/query/picklist', {
      method: 'POST',
      headers,
      body: JSON.stringify({ objecttype: 1, fieldname: 'originatinglead', getvalues: true }),
    }).then(r => r.json()),
  ])

  const results = {
    fieldDef: fieldDef ?? meta,
    picklistId,
    patternA_picklist: valueAttempts[0].status === 'fulfilled' ? valueAttempts[0].value : String((valueAttempts[0] as PromiseRejectedResult).reason),
    patternB_dropdown: valueAttempts[1].status === 'fulfilled' ? valueAttempts[1].value : String((valueAttempts[1] as PromiseRejectedResult).reason),
    patternC_byId: valueAttempts[2].status === 'fulfilled' ? valueAttempts[2].value : String((valueAttempts[2] as PromiseRejectedResult).reason),
    patternD_getvalues: valueAttempts[3].status === 'fulfilled' ? valueAttempts[3].value : String((valueAttempts[3] as PromiseRejectedResult).reason),
  }

  return NextResponse.json(results, { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}
