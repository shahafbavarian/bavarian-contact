import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, phone, message, utm_source, utm_campaign } = body

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'שם וטלפון הם שדות חובה' }, { status: 400 })
    }

    const { error } = await supabase.from('leads').insert({
      name: name.trim(),
      phone: phone.trim(),
      message: message?.trim() || null,
      utm_source: utm_source || null,
      utm_campaign: utm_campaign || null,
    })

    if (error) throw error

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
