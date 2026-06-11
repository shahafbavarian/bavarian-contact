import { NextResponse } from 'next/server'
import { fetchCarList } from '@/lib/scraper'
import { shouldSync, syncCarImages } from '@/lib/image-sync'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!shouldSync()) {
    return NextResponse.json({ status: 'throttled' })
  }
  const cars = await fetchCarList()
  // fire-and-forget — caller gets immediate response
  syncCarImages(cars).catch(e => console.error('[sync-images]', e))
  return NextResponse.json({ status: 'started', count: cars.length })
}
