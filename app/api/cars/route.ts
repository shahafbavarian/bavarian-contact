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

async function enrichCar(car: CarSummary): Promise<CarSummary> {
  try {
    const detail = await fetchCarDetail(car.recNo)
    return {
      ...car,
      yad:            car.yad || (detail?.yad ?? ''),
      pollutionGrade: detail?.pollutionGrade ?? null,
      safetyLevel:    detail?.safetyLevel ?? null,
    }
  } catch {
    return car
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') // 'stock' | 'europe' | null = all

    const cars = await fetchCarList()
    const enriched = await pLimit(cars, enrichCar, 10)

    const result = filter === 'stock'
      ? enriched.filter(c => c.status.includes('מלאי'))
      : filter === 'europe'
      ? enriched.filter(c => !c.status.includes('מלאי'))
      : enriched

    return NextResponse.json({ cars: result })
  } catch (err) {
    console.error('[/api/cars]', err)
    return NextResponse.json({ cars: [], error: String(err) }, { status: 500 })
  }
}
