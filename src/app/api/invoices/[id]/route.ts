import { NextRequest, NextResponse } from 'next/server'
import { invoices } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function deriveStatus(amount: number, paid: number, dueDate: Date | null): string {
  if (paid >= amount && amount > 0) return 'paid'
  if (dueDate && new Date(dueDate) < new Date() && paid < amount) return 'overdue'
  if (paid > 0) return 'partial'
  return 'unpaid'
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json()
    const amount = Number(b.amount) || 0
    const paid = Number(b.paidAmount) || 0
    const dueDate = b.dueDate ? new Date(b.dueDate) : null
    await invoices.update(params.id, {
      customerId: b.customerId || null,
      customerName: b.customerName || null,
      date: b.date ? new Date(b.date) : undefined,
      dueDate,
      amount,
      paidAmount: paid,
      status: deriveStatus(amount, paid, dueDate),
      notes: b.notes || null,
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await invoices.remove(params.id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
