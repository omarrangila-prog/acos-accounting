import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ACCOUNTS = {
  '4444': {
    accountId: 'cfood_production',
    isDemo: false,
    databaseMode: 'production' as const,
    tenantId: 'cfood_production',
  },
  '5555': {
    accountId: 'demo',
    isDemo: true,
    databaseMode: 'tenant' as const,
    tenantId: 'demo',
  },
} as const

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const pin = String(body?.pin ?? '').trim()
    const account = ACCOUNTS[pin as keyof typeof ACCOUNTS]

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Incorrect PIN. Please try again.' },
        { status: 401 },
      )
    }

    const res = NextResponse.json({ success: true, account })
    res.cookies.set('acos_account', JSON.stringify(account), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    // Clear any stale cookie from the old auth system
    res.cookies.set('acos_session', '', { path: '/', maxAge: 0 })
    return res
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to select account.' }, { status: 500 })
  }
}
