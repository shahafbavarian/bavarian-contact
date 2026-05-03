import { NextResponse } from 'next/server'

const PICKLIST_TYPE = 'b4919f2e-2996-48e4-a03c-ba39fb64386c'

export async function GET() {
  const key = process.env.FIREBERRY_API_KEY
  if (!key) return NextResponse.json({ error: 'FIREBERRY_API_KEY not set' }, { status: 500 })

  const headers = { tokenId: key, 'Content-Type': 'application/json' }

  // Get all columns for Account (object type 1)
  const res = await fetch('https://api.powerlink.co.il/api/query/picklist', {
    method: 'POST',
    headers,
    body: JSON.stringify({ objecttype: 1 }),
  })
  const json = await res.json()
  const columns: { name: string; fieldname: string; systemfieldtypeid: string }[] =
    json?.data?.Columns ?? []

  // Filter only picklist/dropdown fields
  const picklistFields = columns.filter(c => c.systemfieldtypeid === PICKLIST_TYPE)

  // For each dropdown field, fetch its values
  const results = await Promise.all(
    picklistFields.map(async col => {
      const r = await fetch('https://api.powerlink.co.il/api/query/picklist', {
        method: 'POST',
        headers,
        body: JSON.stringify({ objecttype: 1, fieldname: col.fieldname }),
      })
      const data = await r.json()
      return { fieldname: col.fieldname, label: col.name, values: data }
    })
  )

  // Return as HTML with proper charset so Hebrew is readable
  const rows = results
    .map(f => `
      <h3>${f.label} <small style="color:#888">(${f.fieldname})</small></h3>
      <pre style="background:#f5f5f5;padding:8px;font-size:12px">${JSON.stringify(f.values, null, 2)}</pre>
    `).join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Fireberry Fields</title></head>
<body style="font-family:sans-serif;padding:20px;direction:rtl">
<h1>שדות Dropdown — לקוח (סוג 1)</h1>
${rows || '<p>לא נמצאו שדות dropdown</p>'}
</body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
