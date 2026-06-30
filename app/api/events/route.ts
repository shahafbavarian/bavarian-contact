import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, device, utm_source, rec_no } = body

    if (!type || typeof type !== 'string' || type.length > 50) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()
    const full = {
      type,
      device: device || null,
      utm_source: utm_source || null,
      rec_no: rec_no || null,
    }

    let { error } = await sb.from('events').insert(full)

    // Fallback: if the rec_no column doesn't exist yet, retry without it so
    // tracking keeps working until the migration is run.
    if (error?.code === '42703') {
      const { rec_no: _omit, ...legacy } = full
      const retry = await sb.from('events').insert(legacy)
      error = retry.error
    }

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
