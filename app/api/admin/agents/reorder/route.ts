import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Body: { ids: string[] } — the full display order. Protected by middleware.
export async function POST(req: Request) {
  let ids: unknown
  try { ({ ids } = await req.json()) } catch { return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 }) }
  if (!Array.isArray(ids) || ids.length > 500 || !ids.every(i => typeof i === 'string')) {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()
  const results = await Promise.all(
    (ids as string[]).map((id, i) => sb.from('agents').update({ sort_order: i }).eq('id', id)),
  )
  const failed = results.find(r => r.error)
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 })

  revalidatePath('/team')
  return NextResponse.json({ ok: true })
}
