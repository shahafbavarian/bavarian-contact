import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const { data } = await getSupabaseAdmin()
      .from('car_overrides')
      .select('rec_no, pollution_grade, safety_level')

    const map: Record<string, { pollutionGrade: number | null; safetyLevel: number | null }> = {}
    for (const row of data ?? []) {
      map[row.rec_no] = {
        pollutionGrade: row.pollution_grade ?? null,
        safetyLevel: row.safety_level ?? null,
      }
    }
    return NextResponse.json(map)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { rec_no, pollution_grade, safety_level } = await req.json()
    if (!rec_no) return NextResponse.json({ error: 'missing rec_no' }, { status: 400 })

    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const sb = getSupabaseAdmin()

    if (pollution_grade === null && safety_level === null) {
      await sb.from('car_overrides').delete().eq('rec_no', rec_no)
    } else {
      await sb.from('car_overrides').upsert(
        { rec_no, pollution_grade: pollution_grade ?? null, safety_level: safety_level ?? null },
        { onConflict: 'rec_no' }
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
