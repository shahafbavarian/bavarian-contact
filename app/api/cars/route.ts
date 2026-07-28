import { NextResponse } from 'next/server'
import { fetchCarList, fetchCarDetail, CarSummary } from '@/lib/scraper'
import { getCachedImageUrls } from '@/lib/image-sync'

// Route reads query params (filter, basic) so it must run dynamically.
// Data caching is handled inside fetchCarList (next: { revalidate: 300 }).
export const dynamic = 'force-dynamic'

// Enrichment fans out one request per car. Give the function room, but never
// rely on that room — ENRICH_BUDGET_MS below is what actually keeps us safe.
export const maxDuration = 30

// How long the per-car enrichment pass may run before we return what we have.
// Serving a partially enriched list instantly beats timing out the whole
// request: the only field it adds for the car list is `yad`.
const ENRICH_BUDGET_MS = 8000

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

function makeEnricher(deadline: number) {
  return async function enrichCar(car: CarSummary): Promise<CarSummary> {
    // Past the budget: hand the car back untouched instead of starting another
    // scrape. Workers drain the queue quickly once this trips.
    if (Date.now() >= deadline) return car
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
}

function applyFilter(cars: CarSummary[], filter: string | null): CarSummary[] {
  if (filter === 'stock')  return cars.filter(c => c.status.includes('מלאי'))
  if (filter === 'europe') return cars.filter(c => !c.status.includes('מלאי'))
  return cars
}

// Let Vercel's CDN answer repeat polls (every open tab refreshes on a 5-minute
// timer) instead of waking the function for each one.
const CDN_CACHE = 'public, s-maxage=300, stale-while-revalidate=600'

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

    // Image syncing deliberately does NOT happen here. It used to be kicked off
    // unawaited on every call, which meant it was killed the moment the function
    // responded, and its once-per-15-min guard is a module-level variable that
    // each serverless instance holds its own copy of — so instead of one sync,
    // every cold instance started another. It now runs from a daily cron.
    // ?basic=1: return raw list immediately (no detail scrapes, no gov.il calls)
    if (basic) {
      return NextResponse.json(
        { cars: applyFilter(withCdn, filter) },
        { headers: { 'Cache-Control': CDN_CACHE } },
      )
    }

    const enriched = await pLimit(withCdn, makeEnricher(Date.now() + ENRICH_BUDGET_MS), 10)
    return NextResponse.json(
      { cars: applyFilter(enriched, filter) },
      { headers: { 'Cache-Control': CDN_CACHE } },
    )
  } catch (err) {
    console.error('[/api/cars]', err)
    return NextResponse.json({ cars: [], error: String(err) }, { status: 500 })
  }
}
