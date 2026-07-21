import { NextRequest, NextResponse } from 'next/server'
import { decodeSession, SESSION_COOKIE_NAME } from '@/lib/session'

// Public paths that never require authentication
const PUBLIC = new Set(['/login'])
// API paths that are part of the auth flow itself
const AUTH_API = /^\/api\/auth\//

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow Next.js internals, static assets, auth API calls, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    AUTH_API.test(pathname) ||
    PUBLIC.has(pathname)
  ) {
    return NextResponse.next()
  }

  // Validate session cookie
  const raw = req.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = raw ? decodeSession(raw) : null

  if (!session) {
    // API routes get 401 JSON, page routes get redirect to /login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated — attach tenantId as a request header so API routes can
  // read it without re-parsing the cookie (cookies() API also works in routes,
  // but headers are lighter and avoid an extra import).
  const res = NextResponse.next()
  res.headers.set('x-tenant-id', session.tenantId)
  res.headers.set('x-is-demo', String(session.isDemo))
  return res
}

export const config = {
  // Match all paths except Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
