import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { parseAgentInput, revalidateAgent } from '@/lib/agents'

export const dynamic = 'force-dynamic'

// Protected by middleware (/api/admin/*). There is deliberately no DELETE:
// agents are deactivated, so their permanent id is never handed to anyone else.

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 }) }

  const parsed = parseAgentInput(body, true)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data, error } = await getSupabaseAdmin()
    .from('agents')
    .update({ ...parsed.fields, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidateAgent(data.public_id)
  return NextResponse.json({ agent: data })
}
