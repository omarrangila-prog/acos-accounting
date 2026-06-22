import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    let invoices = await prisma.invoice.findMany({ orderBy: { date: 'desc' } })
    // refresh derived overdue status on read
    invoices = invoices.map((i) => ({ ...i, status: deriveStatus(i.amount, i.paidAmount, i.dueDate) })) as any
    let data = invoices
    if (search) {
      const s = search.toLowerCase()
      data = data.filter((i) => i.invoiceNumber.toLowerCase().includes(s) || (i.customerName || '').toLowerCase().includes(s))
    }
    if (status) data = data.filter((i) => i.status === status)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Next number derived from the highest existing INV-#### (not count()), so
// deletions never cause a duplicate against the unique constraint.
async function nextInvoiceNumber(): Promise<string> {
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: 'INV-' } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })
  const n = last ? parseInt(last.invoiceNumber.replace('INV-', ''), 10) || 0 : 0
  return `INV-${String(n + 1).padStart(4, '0')}`
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const amount = Number(b.amount) || 0
    const paid = Number(b.paidAmount) || 0
    const dueDate = b.dueDate ? new Date(b.dueDate) : null
    const data = {
      customerId: b.customerId || null,
      customerName: b.customerName || null,
      date: b.date ? new Date(b.date) : new Date(),
      dueDate,
      amount,
      paidAmount: paid,
      status: deriveStatus(amount, paid, dueDate),
      notes: b.notes || null,
    }

    // Retry once on a unique-collision (concurrent creates) with a fresh number.
    let inv
    for (let attempt = 0; attempt < 2; attempt++) {
      const invoiceNumber = b.invoiceNumber || (await nextInvoiceNumber())
      try {
        inv = await prisma.invoice.create({ data: { invoiceNumber, ...data } })
        break
      } catch (err: any) {
        if (err?.code === 'P2002' && !b.invoiceNumber && attempt === 0) continue
        throw err
      }
    }
    return NextResponse.json({ success: true, id: inv!.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
