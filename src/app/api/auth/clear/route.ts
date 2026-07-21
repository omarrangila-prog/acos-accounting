import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// One-shot cookie reset — clears all old and new auth cookies.
// Visit this URL once in the browser to reset state, then log in again.
export async function GET() {
  const res = NextResponse.json({ cleared: true, message: 'All auth cookies cleared. Go to /login' })
  const opts = { path: '/', maxAge: 0, sameSite: 'lax' as const }
  res.cookies.set('acos_account', '', opts)
  res.cookies.set('acos_session', '', opts)
  return res
}
