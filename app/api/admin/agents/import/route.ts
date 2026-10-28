import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { newPublicId, parseAgentInput, revalidateAgent } from '@/lib/agents'
import { saveAgentPhoto } from '@/lib/agent-photos'
import type { Agent } from '@/lib/agent-format'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Imports ONE person from the main site's team mapping file per request, so
// the admin page can show progress and a failure never loses earlier work.
// Idempotent: people are matched by the main site's recNo, so re-running only
// fills in what is missing. Protected by middleware (/api/admin/*).

// Corrections the owner approved for the source data (28.10.2026).
const CORRECTIONS: Record<number, { email?: string }> = {
  280578: { email: 'niroperation@gmail.com' }, // source had "gmail.con"
}

const PHOTO_HOSTS = new Set(['bavarian-motors.co.il', 'www.bavarian-motors.co.il'])

type Person = { recNo: number; name: string; role?: string | null; phone: string; email?: string | null; photo_url?: string | null; refreshPhoto?: boolean }

async function fetchSourcePhoto(url: string): Promise<Buffer> {
  const u = new URL(url)
  // Only the main site's uploads — this endpoint must not fetch arbitrary URLs.
  if (u.protocol !== 'https:' || !PHOTO_HOSTS.has(u.hostname)) throw new Error('photo host not allowed')
  const res = await fetch(u, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`photo HTTP ${res.status}`)
  if (!(res.headers.get('content-type') ?? '').startsWith('image/')) throw new Error('not an image')
  return Buffer.from(await res.arrayBuffer())
}

export async function POST(req: Request) {
  let p: Person
  try { p = await req.json() } catch { return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 }) }
  if (!Number.isInteger(p?.recNo) || p.recNo <= 0) return NextResponse.json({ error: 'recNo חסר' }, { status: 400 })

  const fix = CORRECTIONS[p.recNo] ?? {}
  const parsed = parseAgentInput({
    full_name: p.name,
    phone: p.phone,
    email: fix.email ?? p.email ?? '',
    title: p.role ?? '',
  }, false)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const sb = getSupabaseAdmin()
  const existing = await sb.from('agents').select('*').eq('source_rec_no', p.recNo).maybeSingle()
  if (existing.error) {
    const missing = existing.error.code === '42703' || existing.error.code === 'PGRST204'
    return NextResponse.json({ error: missing ? 'חסרה העמודה source_rec_no — יש להריץ את עדכון ה-SQL' : existing.error.message }, { status: 500 })
  }

  let agent = existing.data as Agent | null
  let status: 'created' | 'exists' = 'exists'

  if (!agent) {
    const { data: last } = await sb.from('agents').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
    const sort_order = (last?.sort_order ?? -1) + 1
    for (let attempt = 0; attempt < 5 && !agent; attempt++) {
      const { data, error } = await sb.from('agents')
        .insert({ ...parsed.fields, public_id: newPublicId(), sort_order, active: true, source_rec_no: p.recNo })
        .select('*').single()
      if (!error) { agent = data as Agent; break }
      // 23505 on public_id → retry; on source_rec_no → a parallel run created it
      if (error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 })
      const again = await sb.from('agents').select('*').eq('source_rec_no', p.recNo).maybeSingle()
      if (again.data) agent = again.data as Agent
    }
    if (!agent) return NextResponse.json({ error: 'יצירת מזהה נכשלה, נסו שוב' }, { status: 500 })
    status = 'created'
    revalidateAgent(agent.public_id)
  }

  // Photo: only when the person has none yet, so a manual upload is never
  // overwritten — unless the admin explicitly asked to refresh from the source.
  let photo: 'imported' | 'kept' | 'none' | 'failed' = agent.photo_url ? 'kept' : 'none'
  if (p.photo_url && (!agent.photo_url || p.refreshPhoto === true)) {
    try {
      agent = await saveAgentPhoto(agent, await fetchSourcePhoto(p.photo_url))
      photo = 'imported'
    } catch (err) {
      console.error('[/api/admin/agents/import] photo', p.recNo, err)
      photo = 'failed'
    }
  }

  return NextResponse.json({ status, photo, agent })
}
