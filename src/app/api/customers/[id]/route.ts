import { NextRequest, NextResponse } from 'next/server'
import { customers } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const c = await customers.findWithTxns(params.id)
    if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(c)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json()
    await customers.update(params.id, {
      name: b.name,
      phone: b.phone || null,
      address: b.address || null,
      openingBalance: Number(b.openingBalance) || 0,
      balanceType: b.balanceType === 'credit' ? 'credit' : 'debit',
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await customers.remove(params.id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
