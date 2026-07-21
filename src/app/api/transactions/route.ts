import { NextRequest, NextResponse } from 'next/server'
import { makeDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const s = getSession()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const b = await req.json()
    if (!b.customerId) return NextResponse.json({ error: 'Customer required' }, { status: 400 })
    const t = await makeDb(s.tenantId).transactions.create({
      customerId: b.customerId,
      description: b.description || null,
      type: b.type === 'credit' ? 'credit' : 'debit',
      amount: Number(b.amount) || 0,
      date: b.date ? new Date(b.date) : new Date(),
    })
    return NextResponse.json({ success: true, id: t.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = getSession()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await makeDb(s.tenantId).transactions.remove(id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
