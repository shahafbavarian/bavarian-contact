import type { CarSummary } from '@/lib/scraper'
import { fetchCarList } from '@/lib/scraper'
import { getCachedImageUrls } from '@/lib/image-sync'
import CarsClient from './CarsClient'

// Rendered at deploy time and refreshed in the background every 5 minutes.
// Visitors get finished HTML from the CDN — the source site is never on the
// path of a user request, so a slow scrape can no longer stall the page.
export const revalidate = 300

export default async function CarsPage() {
  let cars: CarSummary[] = []
  try {
    const [list, cdnUrls] = await Promise.all([fetchCarList(), getCachedImageUrls()])
    cars = list
      .map(c => (cdnUrls[c.recNo] ? { ...c, imageUrl: cdnUrls[c.recNo] } : c))
      .filter(c => c.imageUrl)
  } catch {
    // Leave the list empty — the client fills it in from /api/cars so a failed
    // revalidation degrades to the old behaviour instead of an error page.
  }

  return <CarsClient initialCars={cars} />
}
