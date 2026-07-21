import { NextRequest, NextResponse } from 'next/server'
import { makeDb } from '@/lib/db'
import { getServerAccount } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const s = getServerAccount()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = makeDb(s.tenantId)
    const search = (req.nextUrl.searchParams.get('search') || '').toLowerCase()
    const category = req.nextUrl.searchParams.get('category') || ''
    const list = (await db.expenses.findMany())
      .filter((e) => (search ? (e.description || '').toLowerCase().includes(search) : true))
      .filter((e) => (category ? e.category === category : true))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return NextResponse.json(list)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = getServerAccount()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const b = await req.json()
    if (!b.description || b.amount === undefined)
      return NextResponse.json({ error: 'Description and amount required' }, { status: 400 })
    const e = await makeDb(s.tenantId).expenses.create({
      category: b.category || 'general',
      description: b.description,
      amount: Number(b.amount) || 0,
      paymentMethod: b.paymentMethod || 'cash',
      date: b.date ? new Date(b.date) : new Date(),
      isRecurring: !!b.isRecurring,
      recurringPeriod: b.isRecurring ? (b.recurringPeriod || 'monthly') : null,
      notes: b.notes || null,
    })
    return NextResponse.json({ success: true, id: e.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
