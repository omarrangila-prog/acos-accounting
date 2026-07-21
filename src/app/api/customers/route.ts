import { NextRequest, NextResponse } from 'next/server'
import { makeDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function netOf(c: any): number {
  const opening = c.balanceType === 'credit' ? -c.openingBalance : c.openingBalance
  const txns = (c.transactions || []).reduce(
    (s: number, t: any) => s + (t.type === 'credit' ? -t.amount : t.amount), 0,
  )
  return opening + txns
}

function requireSession() {
  const s = getSession()
  if (!s) return null
  return s
}

export async function GET(req: NextRequest) {
  try {
    const s = requireSession()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = makeDb(s.tenantId)
    const search = (req.nextUrl.searchParams.get('search') || '').toLowerCase()
    const list = await db.customers.findManyWithTxns()
    const data = list
      .filter((c) => (search ? (c.name || '').toLowerCase().includes(search) : true))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((c) => ({ ...c, currentBalance: netOf(c), transactions: undefined }))
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = requireSession()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = makeDb(s.tenantId)
    const b = await req.json()
    if (!b.name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const c = await db.customers.create({
      name: b.name,
      phone: b.phone || null,
      address: b.address || null,
      openingBalance: Number(b.openingBalance) || 0,
      balanceType: b.balanceType === 'credit' ? 'credit' : 'debit',
    })
    return NextResponse.json({ success: true, id: c.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
