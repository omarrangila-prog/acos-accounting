import { NextRequest, NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/session'

export const runtime = 'nodejs'

// PIN → account mapping. Lives server-side only — never sent to the browser.
// 4444 → existing top-level production collections (customers/, invoices/, etc.)
// 5555 → tenants/demo/ sub-collections (isolated demo data)
const PIN_ACCOUNTS: Record<string, { tenantId: string; isDemo: boolean }> = {
  '4444': { tenantId: 'cfood_production', isDemo: false },
  '5555': { tenantId: 'demo', isDemo: true },
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const pin = String(body?.pin ?? '').trim()

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'Please enter a valid 4-digit PIN.' }, { status: 400 })
    }

    const account = PIN_ACCOUNTS[pin]

    if (!account) {
      return NextResponse.json({ error: 'Incorrect PIN. Please try again.' }, { status: 401 })
    }

    const { name, value, opts } = setSessionCookie({
      tenantId: account.tenantId,
      isDemo: account.isDemo,
      iat: Date.now(),
    })

    const res = NextResponse.json({ success: true, isDemo: account.isDemo })
    res.cookies.set(name, value, opts as any)
    return res
  } catch {
    return NextResponse.json({ error: 'Unable to sign in. Please try again.' }, { status: 500 })
  }
}
