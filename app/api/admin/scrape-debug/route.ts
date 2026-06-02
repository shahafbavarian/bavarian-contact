import { NextResponse } from 'next/server'
import { fetchRawHtml, fetchCarList, fetchCarDetail } from '@/lib/scraper'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [raw, cars] = await Promise.allSettled([
      fetchRawHtml(),
      fetchCarList(),
    ])

    const rawData = raw.status === 'fulfilled' ? raw.value : { error: String((raw as PromiseRejectedResult).reason) }
    const carsData = cars.status === 'fulfilled' ? cars.value : { error: String((cars as PromiseRejectedResult).reason) }

    // Try fetching first car detail if we have any
    let sampleDetail = null
    if (Array.isArray(carsData) && carsData.length > 0) {
      sampleDetail = await fetchCarDetail(carsData[0].recNo).catch(e => ({ error: String(e) }))
    }

    return NextResponse.json(
      { ...rawData, parsedList: carsData, sampleDetail },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
