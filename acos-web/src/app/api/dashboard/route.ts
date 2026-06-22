import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, format,
  startOfWeek, addDays,
} from 'date-fns'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function custBalance(c: any): number {
  const opening = c.balanceType === 'credit' ? -c.openingBalance : c.openingBalance
  const txns = (c.transactions || []).reduce((s: number, t: any) => s + (t.type === 'credit' ? -t.amount : t.amount), 0)
  return opening + txns
}

export async function GET() {
  try {
    const now = new Date()
    const [customers, invoices, expenses, pdcs] = await Promise.all([
      prisma.customer.findMany({ include: { transactions: true } }),
      prisma.invoice.findMany(),
      prisma.expense.findMany(),
      prisma.pDC.findMany(),
    ])

    let totalReceivables = 0, totalPayables = 0
    customers.forEach((c) => {
      const bal = custBalance(c)
      if (bal >= 0) totalReceivables += bal
      else totalPayables += -bal
    })

    const monthStart = startOfMonth(now), monthEnd = endOfMonth(now)
    const todayStart = startOfDay(now), todayEnd = endOfDay(now)

    const inRange = (d: Date | string, a: Date, b: Date) => { const x = new Date(d); return x >= a && x <= b }

    const monthRevenue = invoices.filter((i) => inRange(i.date, monthStart, monthEnd)).reduce((s, i) => s + i.paidAmount, 0)
    const monthExpenses = expenses.filter((e) => inRange(e.date, monthStart, monthEnd)).reduce((s, e) => s + e.amount, 0)
    const todayRevenue = invoices.filter((i) => inRange(i.date, todayStart, todayEnd)).reduce((s, i) => s + i.paidAmount, 0)
    const todayExpenses = expenses.filter((e) => inRange(e.date, todayStart, todayEnd)).reduce((s, e) => s + e.amount, 0)

    const pdcReceivable = pdcs.filter((p) => p.pdcType === 'receivable').reduce((s, p) => s + p.amount, 0)
    const pdcPayable = pdcs.filter((p) => p.pdcType === 'payable').reduce((s, p) => s + p.amount, 0)

    const outstandingInvoices = invoices.filter((i) => i.paidAmount < i.amount).length
    const overdueCount = invoices.filter((i) => i.dueDate && new Date(i.dueDate) < now && i.paidAmount < i.amount).length

    // 6-month revenue vs expenses
    const monthlyData = []
    for (let k = 5; k >= 0; k--) {
      const m = subMonths(now, k)
      const a = startOfMonth(m), b = endOfMonth(m)
      monthlyData.push({
        label: format(m, 'MMM'),
        revenue: invoices.filter((i) => inRange(i.date, a, b)).reduce((s, i) => s + i.paidAmount, 0),
        expenses: expenses.filter((e) => inRange(e.date, a, b)).reduce((s, e) => s + e.amount, 0),
      })
    }

    // weekly cash flow (current week, Mon-Sun)
    const wkStart = startOfWeek(now, { weekStartsOn: 1 })
    const weeklyData = []
    for (let d = 0; d < 7; d++) {
      const day = addDays(wkStart, d)
      const a = startOfDay(day), b = endOfDay(day)
      weeklyData.push({
        label: format(day, 'EEE'),
        inflow: invoices.filter((i) => inRange(i.date, a, b)).reduce((s, i) => s + i.paidAmount, 0),
        outflow: expenses.filter((e) => inRange(e.date, a, b)).reduce((s, e) => s + e.amount, 0),
      })
    }

    return NextResponse.json({
      todayProfit: todayRevenue - todayExpenses,
      monthRevenue,
      monthExpenses,
      monthProfit: monthRevenue - monthExpenses,
      totalReceivables,
      totalPayables,
      pdcReceivable,
      pdcPayable,
      outstandingInvoices,
      overdueCount,
      monthlyData,
      weeklyData,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
