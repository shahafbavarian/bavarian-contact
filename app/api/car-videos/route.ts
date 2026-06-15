import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('car_videos')
      .select('rec_no, youtube_url')
    if (error) throw error
    const map: Record<string, string> = {}
    for (const row of data ?? []) map[row.rec_no] = row.youtube_url
    return NextResponse.json(map)
  } catch (err) {
    return NextResponse.json({}, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { rec_no, youtube_url } = await req.json()
    if (!rec_no || !/^\d+$/.test(String(rec_no))) {
      return NextResponse.json({ error: 'rec_no must be numeric' }, { status: 400 })
    }

    if (youtube_url) {
      try {
        const u = new URL(youtube_url)
        const ALLOWED = ['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be']
        if (!ALLOWED.includes(u.hostname)) {
          return NextResponse.json({ error: 'invalid YouTube URL' }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'invalid URL format' }, { status: 400 })
      }
    }

    if (!youtube_url) {
      const { error } = await getSupabaseAdmin().from('car_videos').delete().eq('rec_no', rec_no)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    const { error } = await getSupabaseAdmin()
      .from('car_videos')
      .upsert({ rec_no, youtube_url }, { onConflict: 'rec_no' })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
