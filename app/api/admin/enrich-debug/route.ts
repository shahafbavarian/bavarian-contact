// Debug: shows gov.il result vs detail-scraping result for a single car.
// Usage: /api/admin/enrich-debug?recNo=XXXX
import { NextResponse } from 'next/server'
import { fetchCarSummaryByRecNo, fetchCarDetail } from '@/lib/scraper'
import { fetchGovIndices } from '@/lib/gov-data'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const recNo = searchParams.get('recNo')
  if (!recNo) return NextResponse.json({ error: 'recNo required' }, { status: 400 })

  const summary = await fetchCarSummaryByRecNo(recNo)
  if (!summary) return NextResponse.json({ error: 'car not found in list' }, { status: 404 })

  const [gov, detail] = await Promise.all([
    fetchGovIndices(summary.name, summary.year, summary.engine),
    fetchCarDetail(recNo),
  ])

  return NextResponse.json({
    car: { recNo, name: summary.name, year: summary.year, engine: summary.engine },
    govIl:   { pollutionGrade: gov.pollutionGrade, safetyLevel: gov.safetyLevel },
    website: { pollutionGrade: detail?.pollutionGrade ?? null, safetyLevel: detail?.safetyLevel ?? null },
    final: {
      pollutionGrade: gov.pollutionGrade ?? detail?.pollutionGrade ?? null,
      safetyLevel:    gov.safetyLevel    ?? detail?.safetyLevel    ?? null,
    },
  })
}
