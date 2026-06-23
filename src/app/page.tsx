'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { TrendingUp, DollarSign, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useShell } from '@/components/AppShell'
import { Loading } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

// Lazy-load the heavy chart bundle (recharts) so it doesn't block initial paint.
const DashboardCharts = dynamic(() => import('@/components/DashboardCharts'), {
  ssr: false,
  loading: () => <div className="card p-5"><Loading label="Loading charts…" /></div>,
})

export default function DashboardPage() {
  const { refreshKey } = useShell()
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getDashboard().then(setD).catch(() => {}).finally(() => setLoading(false))
  }, [refreshKey])

  if (loading || !d) return <div className="p-6"><Loading /></div>

  const cards = [
    { label: "Today's Profit", value: formatCurrency(d.todayProfit, true), accent: d.todayProfit >= 0 ? 'text-text-primary' : 'text-danger', icon: <TrendingUp size={18} />, ico: 'bg-accent-light text-accent' },
    { label: 'Monthly Profit', value: formatCurrency(d.monthProfit, true), accent: d.monthProfit >= 0 ? 'text-text-primary' : 'text-danger', sub: `Revenue: ${formatCurrency(d.monthRevenue, true)}`, icon: <DollarSign size={18} />, ico: 'bg-green-100 text-green-600' },
    { label: 'Total Receivables', value: formatCurrency(d.totalReceivables, true), accent: 'text-text-primary', sub: `${d.overdueCount} overdue`, icon: <ArrowDownLeft size={18} />, ico: 'bg-amber-100 text-amber-600' },
    { label: 'Total Payables', value: formatCurrency(d.totalPayables, true), accent: 'text-text-primary', icon: <ArrowUpRight size={18} />, ico: 'bg-red-100 text-red-600' },
  ]
  const small = [
    { label: 'PDC Receivable', value: formatCurrency(d.pdcReceivable, true) },
    { label: 'PDC Payable', value: formatCurrency(d.pdcPayable, true) },
    { label: 'Outstanding Invoices', value: d.outstandingInvoices },
    { label: 'Monthly Expenses', value: formatCurrency(d.monthExpenses, true), accent: 'text-danger' },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-enter">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card-stat p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs text-text-muted mb-1">{c.label}</p>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.ico}`}>{c.icon}</span>
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${c.accent}`}>{c.value}</p>
            {c.sub && <p className="text-xs text-text-muted mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {small.map((c) => (
          <div key={c.label} className="card-stat p-4 sm:p-5">
            <p className="text-xs text-text-muted mb-1">{c.label}</p>
            <p className={`text-xl sm:text-2xl font-bold ${c.accent || 'text-text-primary'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <DashboardCharts d={d} />
    </div>
  )
}
