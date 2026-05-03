import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase'
import { pushLeadToFireberry } from '@/lib/fireberry'

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_HOURS = 1

async function hashIP(ip: string): Promise<string> {
  return createHash('sha256').update(ip).digest('hex')
}

async function checkRateLimit(ipHash: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 3600_000).toISOString()
  const { count, error } = await getSupabaseAdmin()
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since)

  if (error) return true // allow on error to avoid blocking legit users
  return (count ?? 0) < RATE_LIMIT_MAX
}

async function recordRateLimit(ipHash: string): Promise<void> {
  await getSupabaseAdmin().from('rate_limits').insert({ ip_hash: ipHash })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, phone, message, utm_source, utm_campaign, device, website } = body

    // Honeypot: bots fill this hidden field, humans don't
    if (website) {
      return NextResponse.json({ ok: true, id: 'ok' }, { status: 201 })
    }

    if (!phone?.trim()) {
      return NextResponse.json({ error: 'טלפון הוא שדה חובה' }, { status: 400 })
    }

    // IP rate limiting
    const rawIP =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'
    const ipHash = await hashIP(rawIP)

    const allowed = await checkRateLimit(ipHash)
    if (!allowed) {
      return NextResponse.json({ error: 'יותר מדי פניות. נסה שוב מאוחר יותר.' }, { status: 429 })
    }

    const base = {
      name: name?.trim() || null,
      phone: phone.trim(),
      message: message?.trim() || null,
      utm_source: utm_source || null,
      utm_campaign: utm_campaign || null,
    }

    let { data, error } = await getSupabaseAdmin().from('leads').insert({ ...base, device: device || null }).select()

    // Fallback: if device column doesn't exist yet, retry without it
    if (error?.code === '42703') {
      const r2 = await getSupabaseAdmin().from('leads').insert(base).select()
      data = r2.data; error = r2.error
    }

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.error('Insert returned no data — possible RLS block')
      return NextResponse.json({ error: 'לא נשמר — בדוק RLS' }, { status: 500 })
    }

    await recordRateLimit(ipHash)

    // Push to Fireberry CRM — fire and forget, never blocks the response
    pushLeadToFireberry({ name: base.name, phone: base.phone, message: base.message, utm_source: base.utm_source })
      .catch(e => console.error('[fireberry]', e))

    return NextResponse.json({ ok: true, id: data[0].id }, { status: 201 })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids required' }, { status: 400 })
    }
    const { error } = await getSupabaseAdmin().from('leads').delete().in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
