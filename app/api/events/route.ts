import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, device, utm_source } = body

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin().from('events').insert({
      type,
      device: device || null,
      utm_source: utm_source || null,
    })

    if (error) {
      console.error('Supabase events insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('Events API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
