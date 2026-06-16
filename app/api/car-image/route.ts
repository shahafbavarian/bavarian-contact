import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Same hosts allowed for <Image> in next.config.mjs. Whitelisting here
// prevents this proxy from being abused as an open SSRF relay.
function isAllowedHost(hostname: string): boolean {
  if (hostname === 'www.bavarian-motors.co.il') return true
  if (hostname === 'bavarian-motors.co.il') return true
  if (hostname.endsWith('.supabase.co')) return true
  return false
}

// Server-side image proxy so the client can package car photos as File
// objects for navigator.share() without hitting cross-origin (CORS) walls.
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url')
  if (!target) {
    return NextResponse.json({ error: 'url required' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  if (parsed.protocol !== 'https:' || !isAllowedHost(parsed.hostname)) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 403 })
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 })
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'not an image' }, { status: 415 })
    }

    const buf = await res.arrayBuffer()
    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('[/api/car-image]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
