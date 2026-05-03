import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const key = process.env.FIREBERRY_API_KEY
  if (!key) return NextResponse.json({ error: 'FIREBERRY_API_KEY not set' }, { status: 500 })

  const headers = { tokenId: key, 'Content-Type': 'application/json' }

  // Get the full field definition for originatinglead to find any referenced IDs
  let fieldDef: Record<string, unknown> | null = null
  let page = 1
  while (page <= 20 && !fieldDef) {
    const r = await fetch('https://api.powerlink.co.il/api/query/picklist', {
      method: 'POST', headers,
      body: JSON.stringify({ objecttype: 1, PageNum: page }),
    })
    const j = await r.json()
    const cols: Record<string, unknown>[] = j?.data?.Columns ?? []
    fieldDef = cols.find(c => c.fieldname === 'originatinglead') ?? null
    if (j?.data?.IsLastPage || cols.length === 0) break
    page++
  }

  // Try to get actual dropdown VALUES via multiple patterns
  const [a, b, c, d] = await Promise.allSettled([
    // Pattern 1: /api/picklist/{objecttype}/{fieldname}
    fetch(`https://api.powerlink.co.il/api/picklist/1/originatinglead`, { headers }).then(r => r.json()),
    // Pattern 2: /api/picklist/{refobjecttype} if field has one
    fieldDef?.refobjecttype
      ? fetch(`https://api.powerlink.co.il/api/picklist/${fieldDef.refobjecttype}`, { headers }).then(r => r.json())
      : Promise.reject('no refobjecttype'),
    // Pattern 3: query records of the referenced object type
    fieldDef?.refobjecttype
      ? fetch('https://api.powerlink.co.il/api/query/record', {
          method: 'POST', headers,
          body: JSON.stringify({ objecttype: fieldDef.refobjecttype, top: 200 }),
        }).then(r => r.json())
      : Promise.reject('no refobjecttype'),
    // Pattern 4: /api/record/picklist/1 — some CRMs expose all picklists for objecttype
    fetch(`https://api.powerlink.co.il/api/record/picklist/1`, { headers }).then(r => r.json()),
  ])

  const result = {
    fieldDef,
    patternA: a.status === 'fulfilled' ? a.value : String((a as PromiseRejectedResult).reason),
    patternB: b.status === 'fulfilled' ? b.value : String((b as PromiseRejectedResult).reason),
    patternC: c.status === 'fulfilled' ? c.value : String((c as PromiseRejectedResult).reason),
    patternD: d.status === 'fulfilled' ? d.value : String((d as PromiseRejectedResult).reason),
  }

  return NextResponse.json(result, { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}
