import { NextResponse } from 'next/server'
import { fetchCarList, fetchCarDetail, CarSummary } from '@/lib/scraper'
import { fetchGovIndices } from '@/lib/gov-data'

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
    const gov    = await fetchGovIndices(car.name, car.year, car.engine, detail?.licensePlate)
    return {
      ...car,
      yad:            car.yad || (detail?.yad ?? ''),
      pollutionGrade: gov.pollutionGrade ?? detail?.pollutionGrade ?? null,
      safetyLevel:    gov.safetyLevel    ?? detail?.safetyLevel    ?? null,
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

    const cars = await fetchCarList()

    // ?basic=1: return raw list immediately (no detail scrapes, no gov.il calls)
    if (basic) {
      return NextResponse.json({ cars: applyFilter(cars, filter) })
    }

    const enriched = await pLimit(cars, enrichCar, 10)
    return NextResponse.json({ cars: applyFilter(enriched, filter) })
  } catch (err) {
    console.error('[/api/cars]', err)
    return NextResponse.json({ cars: [], error: String(err) }, { status: 500 })
  }
}
