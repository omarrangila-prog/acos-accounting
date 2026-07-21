import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('acos_account', '', { path: '/', maxAge: 0, sameSite: 'lax' })
  return res
}
