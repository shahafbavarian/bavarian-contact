import { NextResponse } from 'next/server'
import { fetchCarList } from '@/lib/scraper'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cars = await fetchCarList()
    return NextResponse.json({ cars }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[/api/cars]', err)
    return NextResponse.json({ cars: [], error: String(err) }, { status: 500 })
  }
}
