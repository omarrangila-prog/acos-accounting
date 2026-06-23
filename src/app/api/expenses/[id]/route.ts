import { NextRequest, NextResponse } from 'next/server'
import { expenses } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json()
    await expenses.update(params.id, {
      category: b.category || 'general',
      description: b.description,
      amount: Number(b.amount) || 0,
      paymentMethod: b.paymentMethod || 'cash',
      date: b.date ? new Date(b.date) : undefined,
      isRecurring: !!b.isRecurring,
      recurringPeriod: b.isRecurring ? (b.recurringPeriod || 'monthly') : null,
      notes: b.notes || null,
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await expenses.remove(params.id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
