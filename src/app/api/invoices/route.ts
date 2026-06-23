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

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('search') || ''
    const status = req.nextUrl.searchParams.get('status') || ''
    let data = (await invoices.findMany())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      // refresh derived overdue status on read
      .map((i) => ({ ...i, status: deriveStatus(i.amount, i.paidAmount, i.dueDate) }))
    if (search) {
      const s = search.toLowerCase()
      data = data.filter((i) => (i.invoiceNumber || '').toLowerCase().includes(s) || (i.customerName || '').toLowerCase().includes(s))
    }
    if (status) data = data.filter((i) => i.status === status)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Next number derived from the highest existing INV-#### so deletions never
// cause a duplicate.
async function nextInvoiceNumber(): Promise<string> {
  const all = await invoices.findMany()
  let max = 0
  for (const i of all) {
    if (typeof i.invoiceNumber === 'string' && i.invoiceNumber.startsWith('INV-')) {
      const n = parseInt(i.invoiceNumber.replace('INV-', ''), 10) || 0
      if (n > max) max = n
    }
  }
  return `INV-${String(max + 1).padStart(4, '0')}`
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const amount = Number(b.amount) || 0
    const paid = Number(b.paidAmount) || 0
    const dueDate = b.dueDate ? new Date(b.dueDate) : null
    const invoiceNumber = b.invoiceNumber || (await nextInvoiceNumber())
    const inv = await invoices.create({
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
