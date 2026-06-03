import { NextResponse } from 'next/server'
import { fetchCarList, fetchCarDetail, CarSummary } from '@/lib/scraper'

// Cache the whole response for 5 minutes — same window as car detail pages
export const revalidate = 300

// Run fn on all items with at most `limit` concurrent promises
async function pLimit<T>(
  items: T[],
  fn: (item: T) => Promise<T>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(items.length)
  let idx = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}

async function enrichYad(car: CarSummary): Promise<CarSummary> {
  if (car.yad) return car
  try {
    const detail = await fetchCarDetail(car.recNo)
    return { ...car, yad: detail?.yad ?? '' }
  } catch {
    return car
  }
}

export async function GET() {
  try {
    const cars = await fetchCarList()
    // Enrich יד from detail spec tables (same source as /car/[recNo] page)
    const enriched = await pLimit(cars, enrichYad, 10)
    return NextResponse.json({ cars: enriched })
  } catch (err) {
    console.error('[/api/cars]', err)
    return NextResponse.json({ cars: [], error: String(err) }, { status: 500 })
  }
}
