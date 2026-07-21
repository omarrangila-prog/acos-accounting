import { NextRequest, NextResponse } from 'next/server'
import { makeDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function custBalance(c: any): number {
  const opening = c.balanceType === 'credit' ? -c.openingBalance : c.openingBalance
  const txns = (c.transactions || []).reduce((s: number, t: any) => s + (t.type === 'credit' ? -t.amount : t.amount), 0)
  return opening + txns
}

export async function GET(req: NextRequest) {
  try {
    const s = getSession()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = makeDb(s.tenantId)

    const type = req.nextUrl.searchParams.get('type') || 'pnl'
    const fromS = req.nextUrl.searchParams.get('from')
    const toS = req.nextUrl.searchParams.get('to')
    const from = fromS ? new Date(fromS) : new Date('2000-01-01')
    const to = toS ? new Date(toS + 'T23:59:59') : new Date()
    const inRange = (d: any) => { const x = new Date(d); return x >= from && x <= to }

    if (type === 'pnl') {
      const [invoices, expenses] = await Promise.all([db.invoices.findMany(), db.expenses.findMany()])
      const revenue = invoices.filter((i) => inRange(i.date)).reduce((s, i) => s + i.paidAmount, 0)
      const exp = expenses.filter((e) => inRange(e.date)).reduce((s, e) => s + e.amount, 0)
      return NextResponse.json({ type, title: 'Profit & Loss', summary: { revenue, expenses: exp, netProfit: revenue - exp },
        rows: [
          { label: 'Total Revenue (collected)', value: revenue },
          { label: 'Total Expenses', value: exp },
          { label: 'Net Profit', value: revenue - exp },
        ] })
    }

    if (type === 'expenses') {
      const expenses = (await db.expenses.findMany()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      const rows = expenses.filter((e) => inRange(e.date))
      return NextResponse.json({ type, title: 'Expenses Report', total: rows.reduce((s, e) => s + e.amount, 0), rows })
    }

    if (type === 'receivables' || type === 'payables') {
      const customers = await db.customers.findManyWithTxns()
      const rows = customers.map((c) => ({ name: c.name, phone: c.phone, balance: custBalance(c) }))
        .filter((r) => type === 'receivables' ? r.balance > 0 : r.balance < 0)
        .map((r) => ({ name: r.name, phone: r.phone, debit: r.balance > 0 ? r.balance : 0, credit: r.balance < 0 ? -r.balance : 0 }))
      return NextResponse.json({ type, title: type === 'receivables' ? 'Receivables' : 'Payables',
        total: rows.reduce((s, r) => s + r.debit + r.credit, 0), rows })
    }

    if (type === 'pdc') {
      const pdcs = await db.pdc.findMany()
      const rows = pdcs.filter((p) => p.chequeDate ? inRange(p.chequeDate) : true)
      return NextResponse.json({ type, title: 'PDC Report', total: rows.reduce((s, p) => s + p.amount, 0), rows })
    }

    if (type === 'ledger') {
      const customers = await db.customers.findManyWithTxns()
      const rows = customers.map((c) => {
        const txns = c.transactions.filter((t: any) => inRange(t.date))
        const balance = custBalance(c)
        return {
          name: c.name,
          debit: balance > 0 ? balance : 0,
          credit: balance < 0 ? -balance : 0,
          txns: txns.length,
        }
      })
      return NextResponse.json({ type, title: 'Customer Ledger', rows })
    }

    return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
