'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { api } from '@/lib/api'
import { useShell } from '@/components/AppShell'
import { Loading } from '@/components/ui'
import { formatCurrency, expenseCategoryLabel, CAT_COLORS } from '@/lib/utils'

export default function AnalyticsPage() {
  const { refreshKey } = useShell()
  const [d, setD] = useState<any>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([api.getDashboard(), api.getExpenses()])
      .then(([dash, exp]) => { setD(dash); setExpenses(exp || []) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [refreshKey])

  if (loading || !d) return <div className="p-6"><Loading /></div>

  const revenue6 = d.monthlyData.reduce((s: number, m: any) => s + m.revenue, 0)
  const expenses6 = d.monthlyData.reduce((s: number, m: any) => s + m.expenses, 0)
  const netProfit6 = revenue6 - expenses6
  const best = [...d.monthlyData].sort((a, b) => (b.revenue - b.expenses) - (a.revenue - a.expenses))[0]
  const bestProfit = best ? best.revenue - best.expenses : 0

  const profitByMonth = d.monthlyData.map((m: any) => ({ label: m.label, profit: m.revenue - m.expenses }))

  const expDist: Record<string, number> = {}
  expenses.forEach((e) => { expDist[e.category] = (expDist[e.category] || 0) + e.amount })
  const pie = Object.entries(expDist).map(([k, v]) => ({ label: expenseCategoryLabel(k), value: v, color: CAT_COLORS[k] || '#64748B' }))

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-enter">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-stat p-4 sm:p-5"><p className="text-xs text-text-muted mb-1">6-Month Revenue</p><p className="text-2xl font-bold text-success">{formatCurrency(revenue6, true)}</p></div>
        <div className="card-stat p-4 sm:p-5"><p className="text-xs text-text-muted mb-1">6-Month Expenses</p><p className="text-2xl font-bold text-danger">{formatCurrency(expenses6, true)}</p></div>
        <div className="card-stat p-4 sm:p-5"><p className="text-xs text-text-muted mb-1">Net Profit (6M)</p><p className={`text-2xl font-bold ${netProfit6 >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(netProfit6, true)}</p></div>
        <div className="card-stat p-4 sm:p-5"><p className="text-xs text-text-muted mb-1">Best Month</p><p className="text-2xl font-bold">{best && bestProfit !== 0 ? best.label : '-'}</p><p className="text-xs text-success">{formatCurrency(bestProfit, true)} profit</p></div>
      </div>

      <div className="card p-5">
        <p className="section-title mb-4">Revenue vs Expenses Trend</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={d.monthlyData}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#12A150" stopOpacity={0.3} /><stop offset="95%" stopColor="#12A150" stopOpacity={0} /></linearGradient>
              <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#DC2626" stopOpacity={0.3} /><stop offset="95%" stopColor="#DC2626" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => formatCurrency(v, true)} />
            <Tooltip formatter={(v: any) => formatCurrency(v)} />
            <Area type="monotone" dataKey="revenue" stroke="#12A150" fill="url(#rev)" strokeWidth={2} />
            <Area type="monotone" dataKey="expenses" stroke="#DC2626" fill="url(#exp)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <p className="section-title mb-4">Net Profit by Month</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={profitByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => formatCurrency(v, true)} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                {profitByMonth.map((m: any, i: number) => <Cell key={i} fill={m.profit >= 0 ? '#12A150' : '#DC2626'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <p className="section-title mb-4">Expense Distribution</p>
          {pie.length === 0 ? <p className="text-sm text-text-muted py-16 text-center">No expense data</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={85} innerRadius={50}>
                  {pie.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
