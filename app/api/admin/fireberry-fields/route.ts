import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const key = process.env.FIREBERRY_API_KEY
  if (!key) return NextResponse.json({ error: 'FIREBERRY_API_KEY not set' }, { status: 500 })

  const headers = { tokenId: key, 'Content-Type': 'application/json' }

  const [records, syslist, syslist2] = await Promise.allSettled([
    // Query real account records — return only originatinglead field
    fetch('https://api.powerlink.co.il/api/query/record', {
      method: 'POST', headers,
      body: JSON.stringify({
        objecttype: 1,
        fields: ['accountid', 'accountname', 'originatinglead'],
        top: 20,
        filter: 'originatinglead <> null',
      }),
    }).then(r => r.json()),

    // SystemList by field name
    fetch('https://api.powerlink.co.il/api/query/systemlist', {
      method: 'POST', headers,
      body: JSON.stringify({ fieldname: 'originatinglead', objecttype: 1 }),
    }).then(r => r.json()),

    // SystemList GET pattern
    fetch('https://api.powerlink.co.il/api/record/systemlist?fieldname=originatinglead&objecttype=1', { headers })
      .then(r => r.json()),
  ])

  const result = {
    records: records.status === 'fulfilled' ? records.value : String((records as PromiseRejectedResult).reason),
    systemlist_post: syslist.status === 'fulfilled' ? syslist.value : String((syslist as PromiseRejectedResult).reason),
    systemlist_get: syslist2.status === 'fulfilled' ? syslist2.value : String((syslist2 as PromiseRejectedResult).reason),
  }

  return NextResponse.json(result, { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}
