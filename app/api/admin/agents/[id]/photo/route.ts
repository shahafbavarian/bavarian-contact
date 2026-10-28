import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { AGENT_PHOTO_BUCKET, revalidateAgent } from '@/lib/agents'
import { saveAgentPhoto } from '@/lib/agent-photos'

export const dynamic = 'force-dynamic'

// Protected by middleware (/api/admin/*).
// The admin page downsizes photos in the browser first, keeping uploads well
// under Vercel's ~4.5MB request limit; this cap is the backstop.
const MAX_BYTES = 4 * 1024 * 1024

async function loadAgent(id: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('agents').select('id, public_id, photo_path').eq('id', id).single()
  if (error) throw error
  return data as { id: string; public_id: string; photo_path: string | null }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof Blob)) return NextResponse.json({ error: 'לא נבחרה תמונה' }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'הקובץ אינו תמונה' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'התמונה גדולה מדי' }, { status: 400 })

    const agent = await saveAgentPhoto(await loadAgent(params.id), Buffer.from(await file.arrayBuffer()))
    return NextResponse.json({ agent })
  } catch (err) {
    console.error('[/api/admin/agents/photo]', err)
    return NextResponse.json({ error: 'העלאת התמונה נכשלה' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const agent = await loadAgent(params.id)
    const sb = getSupabaseAdmin()
    const { data, error } = await sb.from('agents')
      .update({ photo_path: null, photo_url: null, updated_at: new Date().toISOString() })
      .eq('id', agent.id).select('*').single()
    if (error) throw error
    if (agent.photo_path) await sb.storage.from(AGENT_PHOTO_BUCKET).remove([agent.photo_path])
    revalidateAgent(agent.public_id)
    return NextResponse.json({ agent: data })
  } catch (err) {
    console.error('[/api/admin/agents/photo]', err)
    return NextResponse.json({ error: 'הסרת התמונה נכשלה' }, { status: 500 })
  }
}
