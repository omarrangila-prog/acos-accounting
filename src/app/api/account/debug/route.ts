import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerAccount } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const raw = cookies().get('acos_account')?.value
  const account = getServerAccount()

  return NextResponse.json({
    cookiePresent: !!raw,
    cookieValue: raw ? raw.slice(0, 80) + (raw.length > 80 ? '…' : '') : null,
    accountResolved: !!account,
    accountId: account?.accountId ?? null,
    databaseMode: account?.databaseMode ?? null,
    isDemo: account?.isDemo ?? null,
  })
}
