import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const accountId = cookies().get('acos_account')?.value
  if (!accountId) return NextResponse.json({ authenticated: false }, { status: 401 })
  return NextResponse.json({
    authenticated: true,
    accountId,
    isDemo: accountId === 'demo',
  })
}
