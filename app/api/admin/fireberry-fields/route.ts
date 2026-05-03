import { NextResponse } from 'next/server'

const PICKLIST_TYPE = 'b4919f2e-2996-48e4-a03c-ba39fb64386c'

async function getAllColumns(key: string) {
  const headers = { tokenId: key, 'Content-Type': 'application/json' }
  const all: { name: string; fieldname: string; systemfieldtypeid: string }[] = []
  let page = 1

  while (true) {
    const res = await fetch('https://api.powerlink.co.il/api/query/picklist', {
      method: 'POST',
      headers,
      body: JSON.stringify({ objecttype: 1, PageNum: page }),
    })
    const json = await res.json()
    const cols = json?.data?.Columns ?? []
    all.push(...cols)
    if (json?.data?.IsLastPage || cols.length === 0) break
    page++
    if (page > 20) break // safety
  }
  return all
}

export async function GET() {
  const key = process.env.FIREBERRY_API_KEY
  if (!key) return NextResponse.json({ error: 'FIREBERRY_API_KEY not set' }, { status: 500 })

  const headers = { tokenId: key, 'Content-Type': 'application/json' }
  const columns = await getAllColumns(key)
  const dropdownFields = columns.filter(c => c.systemfieldtypeid === PICKLIST_TYPE)

  // Try to get picklist values for each dropdown field
  const results = await Promise.all(
    dropdownFields.map(async col => {
      const r = await fetch('https://api.powerlink.co.il/api/query/picklist', {
        method: 'POST',
        headers,
        body: JSON.stringify({ objecttype: 1, fieldname: col.fieldname }),
      })
      const data = await r.json()
      const values = data?.data?.Columns ?? data?.data ?? data
      return { fieldname: col.fieldname, label: col.name, values }
    })
  )

  const rows = results.map(f => `
    <h3>${f.label} <small style="color:#888">(${f.fieldname})</small></h3>
    <pre style="background:#f5f5f5;padding:8px;font-size:12px;white-space:pre-wrap">${JSON.stringify(f.values, null, 2)}</pre>
  `).join('<hr>')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Fireberry Fields</title></head>
<body style="font-family:sans-serif;padding:20px;direction:rtl;max-width:900px">
<h1>שדות Dropdown — לקוח (${dropdownFields.length} שדות, ${columns.length} עמודות סה״כ)</h1>
${rows || '<p>לא נמצאו שדות dropdown</p>'}
</body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
