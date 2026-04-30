import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, phone, message, utm_source, utm_campaign, device } = body

    if (!phone?.trim()) {
      return NextResponse.json({ error: 'טלפון הוא שדה חובה' }, { status: 400 })
    }

    const { data, error } = await getSupabaseAdmin().from('leads').insert({
      name: name?.trim() || null,
      phone: phone.trim(),
      message: message?.trim() || null,
      utm_source: utm_source || null,
      utm_campaign: utm_campaign || null,
      device: device || null,
    }).select()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.error('Insert returned no data — possible RLS block')
      return NextResponse.json({ error: 'לא נשמר — בדוק RLS' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: data[0].id }, { status: 201 })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
