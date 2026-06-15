// Quick lookup: /api/admin/gov-lookup?name=BMW+M2&year=2023&engine=petrol
import { NextResponse } from 'next/server'
import { fetchGovIndices } from '@/lib/gov-data'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name   = searchParams.get('name')   ?? ''
  const year   = searchParams.get('year')   ?? ''
  const engine = searchParams.get('engine') ?? 'petrol'

  if (!name || name.length < 1 || name.length > 100) {
    return NextResponse.json({ error: 'name required (max 100 chars)' }, { status: 400 })
  }
  if (!year || !/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: 'year must be 4 digits' }, { status: 400 })
  }
  const VALID_ENGINES = ['petrol', 'diesel', 'bev', 'phev', 'hev', 'mhev']
  if (!VALID_ENGINES.includes(engine)) {
    return NextResponse.json({ error: 'invalid engine type' }, { status: 400 })
  }

  const result = await fetchGovIndices(name, year, engine)
  return NextResponse.json({ name, year, engine, ...result })
}
