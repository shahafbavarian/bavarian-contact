import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { newPublicId, parseAgentInput, revalidateAgent } from '@/lib/agents'

export const dynamic = 'force-dynamic'

// Protected by middleware (/api/admin/*).

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from('agents')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agents: data ?? [] })
}

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 }) }

  const parsed = parseAgentInput(body, false)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const sb = getSupabaseAdmin()
  const { data: last } = await sb.from('agents').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const sort_order = (last?.sort_order ?? -1) + 1

  // public_id is permanent and never reused; retry on the rare collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await sb
      .from('agents')
      .insert({ ...parsed.fields, public_id: newPublicId(), sort_order, active: true })
      .select('*')
      .single()
    if (!error) {
      revalidateAgent(data.public_id)
      return NextResponse.json({ agent: data })
    }
    if (error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ error: 'יצירת מזהה נכשלה, נסו שוב' }, { status: 500 })
}
