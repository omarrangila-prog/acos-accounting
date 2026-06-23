import { NextRequest, NextResponse } from 'next/server'
import { prisma, insensitive } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Compute current balance = opening + sum(debit txns) - sum(credit txns)
function netOf(c: any): number {
  const opening = c.balanceType === 'credit' ? -c.openingBalance : c.openingBalance
  const txns = (c.transactions || []).reduce(
    (s: number, t: any) => s + (t.type === 'credit' ? -t.amount : t.amount), 0,
  )
  return opening + txns
}

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('search') || ''
    const customers = await prisma.customer.findMany({
      where: search ? { name: { contains: search, ...insensitive } } : undefined,
      include: { transactions: true },
      orderBy: { createdAt: 'desc' },
    })
    const data = customers.map((c) => ({
      ...c,
      currentBalance: netOf(c),
      transactions: undefined,
    }))
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    if (!b.name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const c = await prisma.customer.create({
      data: {
        name: b.name,
        phone: b.phone || null,
        address: b.address || null,
        openingBalance: Number(b.openingBalance) || 0,
        balanceType: b.balanceType === 'credit' ? 'credit' : 'debit',
      },
    })
    return NextResponse.json({ success: true, id: c.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
