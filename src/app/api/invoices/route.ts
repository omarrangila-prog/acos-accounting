import { NextRequest, NextResponse } from 'next/server'
import { makeDb } from '@/lib/db'
import { getServerAccount } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function deriveStatus(amount: number, paid: number, dueDate: Date | null): string {
  if (paid >= amount && amount > 0) return 'paid'
  if (dueDate && new Date(dueDate) < new Date() && paid < amount) return 'overdue'
  if (paid > 0) return 'partial'
  return 'unpaid'
}

export async function GET(req: NextRequest) {
  try {
    const s = getServerAccount()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = makeDb(s.tenantId)
    const search = req.nextUrl.searchParams.get('search') || ''
    const status = req.nextUrl.searchParams.get('status') || ''
    let data = (await db.invoices.findMany())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((i) => ({ ...i, status: deriveStatus(i.amount, i.paidAmount, i.dueDate) }))
    if (search) {
      const sl = search.toLowerCase()
      data = data.filter((i) =>
        (i.invoiceNumber || '').toLowerCase().includes(sl) ||
        (i.customerName || '').toLowerCase().includes(sl),
      )
    }
    if (status) data = data.filter((i) => i.status === status)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = getServerAccount()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = makeDb(s.tenantId)
    const b = await req.json()
    const amount = Number(b.amount) || 0
    const paid = Number(b.paidAmount) || 0
    const dueDate = b.dueDate ? new Date(b.dueDate) : null

    // Derive next invoice number tenant-specifically
    let invoiceNumber = b.invoiceNumber
    if (!invoiceNumber) {
      const all = await db.invoices.findMany()
      let max = 0
      for (const i of all) {
        if (typeof i.invoiceNumber === 'string' && i.invoiceNumber.startsWith('INV-')) {
          const n = parseInt(i.invoiceNumber.replace('INV-', ''), 10) || 0
          if (n > max) max = n
        }
      }
      invoiceNumber = `INV-${String(max + 1).padStart(4, '0')}`
    }

    const inv = await db.invoices.create({
      invoiceNumber,
      customerId: b.customerId || null,
      customerName: b.customerName || null,
      date: b.date ? new Date(b.date) : new Date(),
      dueDate,
      amount,
      paidAmount: paid,
      status: deriveStatus(amount, paid, dueDate),
      notes: b.notes || null,
    })
    return NextResponse.json({ success: true, id: inv.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
