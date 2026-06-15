import { NextResponse } from 'next/server'

const RESOURCE = '053cea08-09bc-40ec-8f7a-156f0677aff3'
const API      = 'https://data.gov.il/api/3/action/datastore_search'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const model = searchParams.get('model') ?? 'X5'
  const year  = searchParams.get('year')  ?? '2023'

  // ── 1. Schema: all field names in the resource ──────────────────────────
  let schema: unknown = null
  try {
    const r = await fetch(`${API}?${new URLSearchParams({ resource_id: RESOURCE, limit: '1' })}`, {
      headers: { Accept: 'application/json' }, cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    const j = await r.json()
    schema = {
      total:      j.result?.total,
      fieldNames: (j.result?.fields ?? []).map((f: { id: string; type: string }) => f.id),
      sampleRecord: j.result?.records?.[0] ?? null,
    }
  } catch (e) { schema = { error: String(e) } }

  // ── 2. Filtered query: model + year ─────────────────────────────────────
  const params = new URLSearchParams({
    resource_id: RESOURCE,
    q:           model,
    limit:       '5',
    filters:     JSON.stringify({ shnat_yitzur: year }),
  })
  let filtered: unknown = null
  try {
    const r = await fetch(`${API}?${params}`, {
      headers: { Accept: 'application/json' }, cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    filtered = await r.json()
  } catch (e) { filtered = { error: String(e) } }

  return NextResponse.json({ queryUrl: `${API}?${params}`, schema, filtered }, { status: 200 })
}
