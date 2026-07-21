import { NextResponse } from 'next/server'
import { makeDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const s = getSession()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = makeDb(s.tenantId)

    const [invoices, expenses, pdcs] = await Promise.all([
      db.invoices.findMany(),
      db.expenses.findMany(),
      db.pdc.findMany(),
    ])

    const records = [
      ...invoices.map((i) => ({
        id: i.id, module: 'Invoice', moduleKey: 'invoice',
        date: i.date, title: i.invoiceNumber, party: i.customerName || '-',
        status: i.status, amount: i.amount,
      })),
      ...expenses.map((e) => ({
        id: e.id, module: 'Expense', moduleKey: 'expense',
        date: e.date, title: e.description, party: e.category,
        status: '—', amount: e.amount,
      })),
      ...pdcs.map((p) => ({
        id: p.id, module: p.pdcType === 'payable' ? 'PDC Payable' : 'PDC Receivable',
        moduleKey: p.pdcType === 'payable' ? 'pdc_payable' : 'pdc_receivable',
        date: p.createdAt, title: p.chequeNumber || p.partyName, party: p.partyName,
        status: p.status, amount: p.amount,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      records,
      counts: {
        total: records.length,
        invoices: invoices.length,
        expenses: expenses.length,
        pdc: pdcs.length,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
