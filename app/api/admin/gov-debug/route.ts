import { NextResponse } from 'next/server'

const RESOURCE = '053cea08-09bc-40ec-8f7a-156f0677aff3'
const API = 'https://data.gov.il/api/3/action/datastore_search'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const model  = searchParams.get('model')  ?? 'X5'
  const year   = searchParams.get('year')   ?? '2023'
  const mfr    = searchParams.get('mfr')    ?? 'ב.מ.וו'

  // 1. Raw query — just model + year, no extra filters
  const params = new URLSearchParams({
    resource_id: RESOURCE,
    q:           model,
    limit:       '5',
    filters:     JSON.stringify({ shnat_yitzur: year }),
  })

  const url = `${API}?${params}`
  let raw: unknown = null
  let error: string | null = null

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    raw = await res.json()
  } catch (e) {
    error = String(e)
  }

  // 2. Also try fetching schema (no filters, limit 1) to see all field names
  let schema: unknown = null
  try {
    const res2 = await fetch(`${API}?${new URLSearchParams({ resource_id: RESOURCE, limit: '1' })}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    const j = await res2.json()
    schema = {
      fields: (j.result?.fields ?? []).map((f: { id: string; type: string }) => ({ id: f.id, type: f.type })),
      total: j.result?.total,
    }
  } catch (e) {
    schema = { error: String(e) }
  }

  return NextResponse.json({
    queryUrl: url,
    params: { model, year, mfr },
    error,
    schema,
    result: raw,
  }, { status: 200 })
}
