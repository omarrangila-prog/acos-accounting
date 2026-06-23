import { NextResponse } from 'next/server'
import { invoices as invoiceRepo, expenses as expenseRepo, pdc as pdcRepo } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Unified feed of all module records for the "All Records" page.
export async function GET() {
  try {
    const [invoices, expenses, pdcs] = await Promise.all([
      invoiceRepo.findMany(),
      expenseRepo.findMany(),
      pdcRepo.findMany(),
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
