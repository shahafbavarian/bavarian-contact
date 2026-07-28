import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method

  const isAdminPage      = pathname.startsWith('/admin')
  const isAdminApi       = pathname.startsWith('/api/admin')
  const isLeadsDelete    = method === 'DELETE' && pathname.startsWith('/api/leads')
  const isCarVideosWrite = method !== 'GET'    && pathname.startsWith('/api/car-videos')
  const isOverridesWrite = method !== 'GET'    && pathname.startsWith('/api/car-overrides')

  if (!isAdminPage && !isAdminApi && !isLeadsDelete && !isCarVideosWrite && !isOverridesWrite) {
    return NextResponse.next()
  }

  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    // Open admin is a local-development convenience. In production a missing
    // password used to silently expose everything behind this middleware —
    // including the leads table, which holds customer names and phone numbers.
    // Fail closed instead: locking the owner out is recoverable, publishing
    // customer contact details is not.
    if (process.env.NODE_ENV !== 'production') return NextResponse.next()
    return new NextResponse('Admin is not configured: set ADMIN_PASSWORD.', { status: 503 })
  }

  const authHeader = req.headers.get('authorization')

  if (authHeader?.startsWith('Basic ')) {
    const encoded = authHeader.slice(6)
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
    const password = decoded.split(':').slice(1).join(':')
    if (password === adminPassword) return NextResponse.next()
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Bavarian Motors Admin"' },
  })
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/leads',
    '/api/leads/:id*',
    '/api/car-videos',
    '/api/car-overrides',
  ],
}
