import { NextResponse } from 'next/server'

const PICKLIST_TYPE = 'b4919f2e-2996-48e4-a03c-ba39fb64386c'

export async function GET() {
  const key = process.env.FIREBERRY_API_KEY
  if (!key) return NextResponse.json({ error: 'FIREBERRY_API_KEY not set' }, { status: 500 })

  const headers = { tokenId: key, 'Content-Type': 'application/json' }

  // 1. Scan all pages to find the "מקור הגעה" field
  let targetField: string | null = null
  let page = 1

  while (page <= 20) {
    const res = await fetch('https://api.powerlink.co.il/api/query/picklist', {
      method: 'POST', headers,
      body: JSON.stringify({ objecttype: 1, PageNum: page }),
    })
    const json = await res.json()
    const cols: { name: string; fieldname: string; systemfieldtypeid: string }[] =
      json?.data?.Columns ?? []

    const found = cols.find(c =>
      c.name?.includes('מקור') && c.systemfieldtypeid === PICKLIST_TYPE
    )
    if (found) { targetField = found.fieldname; break }
    if (json?.data?.IsLastPage || cols.length === 0) break
    page++
  }

  if (!targetField) {
    return new NextResponse(
      `<html><meta charset="utf-8"><body>לא נמצא שדה "מקור" מסוג dropdown בין עמודי הלקוח</body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  // 2. Fetch picklist values for that field
  const res2 = await fetch('https://api.powerlink.co.il/api/query/picklist', {
    method: 'POST', headers,
    body: JSON.stringify({ objecttype: 1, fieldname: targetField }),
  })
  const data2 = await res2.json()

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;padding:20px;direction:rtl">
<h2>שדה: ${targetField}</h2>
<pre style="font-size:14px">${JSON.stringify(data2, null, 2)}</pre>
</body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
