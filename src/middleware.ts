import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = new Set(['/login'])
const PUBLIC_API = /^\/api\/(auth|account)\//

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    PUBLIC_API.test(pathname) ||
    PUBLIC_PATHS.has(pathname)
  ) {
    return NextResponse.next()
  }

  const account = req.cookies.get('acos_account')?.value
  if (!account) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
