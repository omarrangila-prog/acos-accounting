import React, { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import { useStore } from '../store'

export function AnalyticsPage() {
  const { refreshKey } = useStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDashboard().then((d: any) => { setData(d); setLoading(false) })
  }, [refreshKey])

  if (loading) return <div className="flex-1 flex items-center justify-center gap-2 text-text-muted"><RefreshCw size={18} className="animate-spin" /><span className="text-sm">Loading analytics...</span></div>
  if (!data) return null

  const profitData = data.monthlyData || []
  const totalRevenue = profitData.reduce((s: number, d: any) => s + d.revenue, 0)
  const totalExpenses = profitData.reduce((s: number, d: any) => s + d.expenses, 0)
  const bestMonth = profitData.reduce((best: any, d: any) => !best || d.profit > best.profit ? d : best, null)

  const PIE_COLORS = ['#3B6FFF','#12A150','#F5A623','#E53935','#9C27B0','#00BCD4']

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-enter">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-text-muted mb-1">6-Month Revenue</p>
          <p className="text-2xl font-bold text-success">{formatCurrency(totalRevenue, true)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted mb-1">6-Month Expenses</p>
          <p className="text-2xl font-bold text-danger">{formatCurrency(totalExpenses, true)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted mb-1">Net Profit (6M)</p>
          <p className={`text-2xl font-bold ${totalRevenue - totalExpenses >= 0 ? 'text-accent' : 'text-danger'}`}>{formatCurrency(totalRevenue - totalExpenses, true)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted mb-1">Best Month</p>
          <p className="text-2xl font-bold text-text-primary">{bestMonth?.label || '-'}</p>
          {bestMonth && <p className="text-xs text-success mt-1">{formatCurrency(bestMonth.profit, true)} profit</p>}
        </div>
      </div>

      {/* Charts */}
      <div className="card p-5">
        <p className="section-title mb-4">Revenue vs Expenses Trend</p>
        {profitData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <AlertCircle size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No data yet. Start adding invoices and expenses.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={profitData}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B6FFF" stopOpacity={0.15}/><stop offset="95%" stopColor="#3B6FFF" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E53935" stopOpacity={0.15}/><stop offset="95%" stopColor="#E53935" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickFormatter={v => formatCurrency(v, true)} />
              <Tooltip formatter={(v: any, n: any) => [formatCurrency(v), n]} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3B6FFF" fill="url(#gRev)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#E53935" fill="url(#gExp)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="card p-5">
          <p className="section-title mb-4">Net Profit by Month</p>
          {profitData.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-text-muted text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickFormatter={v => formatCurrency(v, true)} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="profit" name="Profit" radius={[4,4,0,0]}>
                  {profitData.map((d: any, i: number) => <Cell key={i} fill={d.profit >= 0 ? '#3B6FFF' : '#E53935'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <p className="section-title mb-4">Expense Distribution</p>
          {!data.expenseByCategory || data.expenseByCategory.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-text-muted text-sm">No expense data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={data.expenseByCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                    {data.expenseByCategory.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v, true)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {data.expenseByCategory.slice(0, 5).map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-text-secondary capitalize">{e.category}</span>
                    </div>
                    <span className="font-medium text-text-primary">{formatCurrency(e.total, true)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Insights */}
      <div className="card p-5">
        <p className="section-title mb-4">AI Business Insights</p>
        <div className="space-y-3">
          {totalRevenue === 0 && totalExpenses === 0 ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-1 border border-border">
              <AlertCircle size={16} className="text-text-muted flex-shrink-0" />
              <p className="text-sm text-text-secondary">Add your first transactions to unlock business insights and forecasts.</p>
            </div>
          ) : (
            <>
              {[
                { icon: totalRevenue - totalExpenses >= 0 ? <TrendingUp size={16} className="text-success" /> : <TrendingDown size={16} className="text-danger" />, text: totalRevenue - totalExpenses >= 0 ? `Your business is profitable over the last 6 months with a net profit of ${formatCurrency(totalRevenue - totalExpenses, true)}.` : `Your expenses exceeded revenue over the last 6 months by ${formatCurrency(totalExpenses - totalRevenue, true)}. Review your cost structure.` },
                { icon: <TrendingUp size={16} className="text-accent" />, text: `Total revenue collected over 6 months: ${formatCurrency(totalRevenue, true)}. Avg monthly: ${formatCurrency(totalRevenue / 6, true)}.` },
                data.overdueCount > 0 && { icon: <AlertCircle size={16} className="text-warning" />, text: `You have ${data.overdueCount} overdue invoice(s) worth ${formatCurrency(data.overdueTotal, true)}. Sending payment reminders can improve cash flow.` },
                bestMonth && { icon: <TrendingUp size={16} className="text-success" />, text: `${bestMonth.label} was your most profitable month with ${formatCurrency(bestMonth.profit, true)} net profit.` },
              ].filter(Boolean).map((insight: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface-1 border border-border">
                  <span className="flex-shrink-0 mt-0.5">{insight.icon}</span>
                  <p className="text-sm text-text-secondary">{insight.text}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
