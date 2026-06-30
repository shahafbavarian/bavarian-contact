import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function isValidYouTube(url: string): boolean {
  try {
    const u = new URL(url)
    return ['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be'].includes(u.hostname)
  } catch {
    return false
  }
}

export async function GET() {
  try {
    const sb = getSupabaseAdmin()
    // Try selecting both video columns; fall back to the single legacy column
    // if the youtube_url_2 migration hasn't been run yet — keeps the page alive.
    let rows: Array<{ rec_no: string; youtube_url: string | null; youtube_url_2?: string | null }> | null = null
    const withBoth = await sb.from('car_videos').select('rec_no, youtube_url, youtube_url_2')
    if (withBoth.error) {
      const single = await sb.from('car_videos').select('rec_no, youtube_url')
      if (single.error) throw single.error
      rows = single.data
    } else {
      rows = withBoth.data
    }

    const map: Record<string, { url1: string | null; url2: string | null }> = {}
    for (const row of rows ?? []) {
      map[row.rec_no] = { url1: row.youtube_url ?? null, url2: row.youtube_url_2 ?? null }
    }
    return NextResponse.json(map)
  } catch {
    return NextResponse.json({}, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const rec_no = body.rec_no
    const url1 = String(body.youtube_url ?? '').trim()
    const url2 = String(body.youtube_url_2 ?? '').trim()

    if (!rec_no || !/^\d+$/.test(String(rec_no))) {
      return NextResponse.json({ error: 'rec_no must be numeric' }, { status: 400 })
    }
    if (url1 && !isValidYouTube(url1)) {
      return NextResponse.json({ error: 'invalid YouTube URL (1)' }, { status: 400 })
    }
    if (url2 && !isValidYouTube(url2)) {
      return NextResponse.json({ error: 'invalid YouTube URL (2)' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()

    // Collapse to non-empty URLs in order: the primary column always holds the
    // first existing video, so youtube_url is never null while a row exists.
    const urls = [url1, url2].filter(Boolean)

    if (urls.length === 0) {
      const { error } = await sb.from('car_videos').delete().eq('rec_no', rec_no)
      if (error) throw error
      revalidatePath(`/car/${rec_no}`)
      return NextResponse.json({ ok: true })
    }

    // Upsert both columns; if the second column doesn't exist yet, fall back to
    // storing just the first video so the feature degrades gracefully.
    const full = await sb
      .from('car_videos')
      .upsert({ rec_no, youtube_url: urls[0], youtube_url_2: urls[1] ?? null }, { onConflict: 'rec_no' })
    if (full.error) {
      const fallback = await sb
        .from('car_videos')
        .upsert({ rec_no, youtube_url: urls[0] }, { onConflict: 'rec_no' })
      if (fallback.error) throw fallback.error
    }
    revalidatePath(`/car/${rec_no}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
