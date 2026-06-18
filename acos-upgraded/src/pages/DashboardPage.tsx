import React, { useEffect, useState } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, DollarSign, ArrowDownLeft, ArrowUpRight, CreditCard, Clock, Activity, RefreshCw, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/utils'
import { useStore } from '../store'
import { cn } from '../lib/utils'

interface StatCardProps { title: string; value: string; subtitle?: string; change?: number; icon: React.ReactNode; accent: string }
function StatCard({ title, value, subtitle, change, icon, accent }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-text-muted font-medium">{title}</p>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', accent)}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
      {change !== undefined && (
        <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', change >= 0 ? 'text-success' : 'text-danger')}>
          <TrendingUp size={12} className={change < 0 ? 'rotate-180' : ''} />
          <span>{Math.abs(change).toFixed(1)}% vs last month</span>
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="card p-3 shadow-modal text-xs">
        <p className="font-semibold text-text-primary mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-text-secondary">{p.name}:</span>
            <span className="font-medium">{formatCurrency(p.value, true)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function DashboardPage() {
  const { refreshKey } = useStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getDashboard().then((d: any) => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [refreshKey])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex items-center gap-3 text-text-muted">
        <RefreshCw size={20} className="animate-spin" />
        <span className="text-sm">Loading dashboard...</span>
      </div>
    </div>
  )

  if (!data) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <Activity size={40} className="text-text-muted mx-auto mb-3" />
        <p className="text-text-muted text-sm">No data available</p>
      </div>
    </div>
  )

  const PIE_COLORS = ['#3B6FFF','#12A150','#F5A623','#E53935','#9C27B0','#00BCD4','#FF7043','#26A69A']

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-enter">
      {/* Alert Banner */}
      {data.overdueCount > 0 && (
        <div className="bg-danger/5 border border-danger/20 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-danger/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-danger" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">⚠ Overdue Invoices Alert</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {data.overdueCount} invoice{data.overdueCount > 1 ? 's are' : ' is'} overdue, totaling {formatCurrency(data.overdueTotal, true)}. Send payment reminders to recover outstanding balances.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Today's Profit" value={formatCurrency(data.todayProfit, true)} icon={<TrendingUp size={18} className="text-accent" />} accent="bg-accent-light" />
        <StatCard title="Monthly Profit" value={formatCurrency(data.netProfit, true)} subtitle={`Revenue: ${formatCurrency(data.monthRevenue, true)}`} icon={<DollarSign size={18} className="text-success" />} accent="bg-success/10" />
        <StatCard title="Total Receivables" value={formatCurrency(data.totalReceivables, true)} subtitle={`${data.overdueCount} overdue`} icon={<ArrowDownLeft size={18} className="text-warning" />} accent="bg-warning/10" />
        <StatCard title="Total Payables" value={formatCurrency(data.totalPayables, true)} icon={<ArrowUpRight size={18} className="text-danger" />} accent="bg-danger/10" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-text-muted mb-1">PDC Receivable</p>
          <p className="text-xl font-bold text-text-primary">{formatCurrency(data.pdcReceivable, true)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted mb-1">PDC Payable</p>
          <p className="text-xl font-bold text-text-primary">{formatCurrency(data.pdcPayable, true)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted mb-1">Outstanding Invoices</p>
          <p className="text-xl font-bold text-text-primary">{data.outstandingInvoices}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted mb-1">Monthly Expenses</p>
          <p className="text-xl font-bold text-danger">{formatCurrency(data.monthExpenses, true)}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-5">
        {/* Monthly P&L */}
        <div className="card p-5">
          <p className="section-title mb-4">Revenue vs Expenses (6 Months)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => formatCurrency(v, true)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" fill="#3B6FFF" radius={[4,4,0,0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#E53935" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Trend */}
        <div className="card p-5">
          <p className="section-title mb-4">Weekly Cash Flow</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.weeklyData}>
              <defs>
                <linearGradient id="colProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B6FFF" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#3B6FFF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => formatCurrency(v, true)} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#3B6FFF" fill="url(#colProfit)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-3 gap-5">
        {/* Expense Breakdown */}
        <div className="card p-5">
          <p className="section-title mb-4">Expense Breakdown</p>
          {data.expenseByCategory.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-muted text-sm">No expenses yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={data.expenseByCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                    {data.expenseByCategory.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v, true)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {data.expenseByCategory.slice(0, 4).map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-text-secondary capitalize">{e.category}</span>
                    </div>
                    <span className="font-medium text-text-primary">{formatCurrency(e.total, true)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Receivable Aging */}
        <div className="card p-5">
          <p className="section-title mb-4">Receivable Aging</p>
          <div className="space-y-3">
            {data.agingData.map((b: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">{b.label}</span>
                  <span className="font-medium text-text-primary">{formatCurrency(b.amount, true)}</span>
                </div>
                <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: data.totalReceivables > 0 ? `${Math.min(100, (b.amount / data.totalReceivables) * 100)}%` : '0%',
                    background: ['#12A150','#F5A623','#FF7043','#E53935'][i] || '#3B6FFF'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card p-5">
          <p className="section-title mb-4">Recent Payments</p>
          {data.recentPayments.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-text-muted text-sm">No payments yet</div>
          ) : (
            <div className="space-y-3">
              {data.recentPayments.slice(0, 5).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-text-primary">{p.customerName}</p>
                    <p className="text-[10px] text-text-muted">{p.invoiceNumber} · {formatDate(p.date)}</p>
                  </div>
                  <span className="text-xs font-semibold text-success">{formatCurrency(p.amount, true)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
