import { NextRequest, NextResponse } from 'next/server'
import { fetchCarList } from '@/lib/scraper'
import { syncCarImages } from '@/lib/image-sync'

export const dynamic = 'force-dynamic'

// The sync downloads and re-uploads car photos, so it needs real room. Steady
// state is cheap (only new or changed images are re-fetched); the first run
// after a deploy does the most work and finishes over the next few runs.
export const maxDuration = 60

// Leave headroom under maxDuration so the function returns a real result
// instead of being killed mid-upload.
const SYNC_BUDGET_MS = 50_000

export async function GET(req: NextRequest) {
  // Vercel strips inbound x-vercel-* headers, so this only matches genuine cron
  // invocations. CRON_SECRET covers manual runs. Without a gate this is an
  // unauthenticated endpoint that does expensive work on demand.
  const isCron = req.headers.get('x-vercel-cron') !== null
  const secret = process.env.CRON_SECRET
  const authorized =
    isCron || (!!secret && req.headers.get('authorization') === `Bearer ${secret}`)

  if (!authorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const cars = await fetchCarList()
    // Awaited: unawaited work does not survive the response on serverless.
    const result = await syncCarImages(cars, Date.now() + SYNC_BUDGET_MS)
    return NextResponse.json({ status: 'ok', count: cars.length, ...result })
  } catch (err) {
    console.error('[sync-images]', err)
    return NextResponse.json({ status: 'error', error: String(err) }, { status: 500 })
  }
}
