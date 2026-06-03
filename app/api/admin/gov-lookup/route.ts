// Quick lookup: /api/admin/gov-lookup?name=BMW+M2&year=2023&engine=petrol
import { NextResponse } from 'next/server'
import { fetchGovIndices } from '@/lib/gov-data'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name   = searchParams.get('name')   ?? ''
  const year   = searchParams.get('year')   ?? ''
  const engine = searchParams.get('engine') ?? 'petrol'

  if (!name || !year) {
    return NextResponse.json({ error: 'name and year are required' }, { status: 400 })
  }

  const result = await fetchGovIndices(name, year, engine)
  return NextResponse.json({ name, year, engine, ...result })
}
