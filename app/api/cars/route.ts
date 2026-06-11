import { NextResponse } from 'next/server'
import { fetchCarList, fetchCarDetail, CarSummary } from '@/lib/scraper'
import { shouldSync, syncCarImages, getCachedImageUrls } from '@/lib/image-sync'

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
      safetyLevel:    detail?.safetyLevel    ?? null,
    }
  } catch {
    return car
  }
}

function applyFilter(cars: CarSummary[], filter: string | null): CarSummary[] {
  if (filter === 'stock')  return cars.filter(c => c.status.includes('מלאי'))
  if (filter === 'europe') return cars.filter(c => !c.status.includes('מלאי'))
  return cars
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') // 'stock' | 'europe' | null = all
    const basic  = searchParams.get('basic') === '1'

    const [cars, cachedUrls] = await Promise.all([fetchCarList(), getCachedImageUrls()])

    // Substitute CDN URLs where available
    const withCdn = cars.map(c =>
      cachedUrls[c.recNo] ? { ...c, imageUrl: cachedUrls[c.recNo] } : c
    )

    // Kick off background sync (throttled to once per 15 min)
    if (shouldSync()) {
      syncCarImages(cars).catch(e => console.error('[sync-images]', e))
    }

    // ?basic=1: return raw list immediately (no detail scrapes, no gov.il calls)
    if (basic) {
      return NextResponse.json({ cars: applyFilter(withCdn, filter) })
    }

    const enriched = await pLimit(withCdn, enrichCar, 10)
    return NextResponse.json({ cars: applyFilter(enriched, filter) })
  } catch (err) {
    console.error('[/api/cars]', err)
    return NextResponse.json({ cars: [], error: String(err) }, { status: 500 })
  }
}
