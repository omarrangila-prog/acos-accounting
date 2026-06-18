import React, { useState } from 'react'
import { FileText, TrendingUp, Users, RefreshCw, Download, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'

type ReportType = 'pl' | 'receivable_aging' | 'expense_report' | 'cash_flow'

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('pl')
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runReport = async () => {
    setLoading(true)
    const result = await api.getReport({ type: reportType, dateFrom, dateTo })
    setData(result)
    setLoading(false)
  }

  const reportOptions = [
    { id: 'pl', label: 'Profit & Loss', icon: <TrendingUp size={16} /> },
    { id: 'receivable_aging', label: 'Receivable Aging', icon: <Users size={16} /> },
    { id: 'expense_report', label: 'Expense Report', icon: <BarChart2 size={16} /> },
    { id: 'cash_flow', label: 'Cash Flow', icon: <FileText size={16} /> },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-enter">
      {/* Controls */}
      <div className="card p-5">
        <p className="section-title mb-4">Generate Report</p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Report Type</label>
            <select className="input w-48" value={reportType} onChange={e => setReportType(e.target.value as ReportType)}>
              {reportOptions.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          {reportType !== 'receivable_aging' && (
            <>
              <div>
                <label className="label">From Date</label>
                <input type="date" className="input w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">To Date</label>
                <input type="date" className="input w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </>
          )}
          <button className="btn-primary" onClick={runReport} disabled={loading}>
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
            {loading ? 'Generating...' : 'Run Report'}
          </button>
        </div>
      </div>

      {/* Report Output */}
      {data && (
        <div className="card p-6 space-y-6">
          {/* P&L Report */}
          {reportType === 'pl' && (
            <>
              <div className="flex items-center justify-between">
                <p className="section-title">Profit & Loss Statement</p>
                <p className="text-xs text-text-muted">{dateFrom} to {dateTo}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="card p-4 bg-success/5 border-success/20">
                  <p className="text-xs text-text-muted mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-success">{formatCurrency(data.revenue)}</p>
                </div>
                <div className="card p-4 bg-danger/5 border-danger/20">
                  <p className="text-xs text-text-muted mb-1">Total Expenses</p>
                  <p className="text-2xl font-bold text-danger">{formatCurrency(data.expenses)}</p>
                </div>
                <div className={`card p-4 ${data.netProfit >= 0 ? 'bg-accent/5 border-accent/20' : 'bg-danger/5 border-danger/20'}`}>
                  <p className="text-xs text-text-muted mb-1">Net Profit</p>
                  <p className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-accent' : 'text-danger'}`}>{formatCurrency(data.netProfit)}</p>
                </div>
              </div>
              {data.expenseBreakdown?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-text-primary mb-3">Expense Breakdown</p>
                  <div className="space-y-2">
                    {data.expenseBreakdown.map((e: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border/50">
                        <span className="text-sm capitalize text-text-secondary">{e.category}</span>
                        <span className="text-sm font-medium text-text-primary">{formatCurrency(e.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Receivable Aging */}
          {reportType === 'receivable_aging' && Array.isArray(data) && (
            <>
              <p className="section-title">Receivable Aging Report</p>
              <div className="grid grid-cols-5 gap-3">
                {data.map((bucket: any, i: number) => (
                  <div key={i} className="card p-4 text-center">
                    <p className="text-xs text-text-muted mb-1">{bucket.label}</p>
                    <p className="text-lg font-bold text-text-primary">{formatCurrency(bucket.total, true)}</p>
                    <p className="text-xs text-text-muted mt-1">{bucket.count} invoice{bucket.count !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
              {data.flatMap((b: any) => b.invoices).length > 0 && (
                <table className="w-full mt-4">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-2 table-header">Invoice</th>
                    <th className="text-left py-2 table-header">Customer</th>
                    <th className="text-left py-2 table-header">Due Date</th>
                    <th className="text-right py-2 table-header">Balance</th>
                    <th className="text-right py-2 table-header">Days Overdue</th>
                  </tr></thead>
                  <tbody>
                    {data.flatMap((b: any) => b.invoices.map((inv: any) => (
                      <tr key={inv.id} className="border-b border-border/50">
                        <td className="py-2 text-sm font-medium text-accent">{inv.invoiceNumber}</td>
                        <td className="py-2 text-sm">{inv.customerName}</td>
                        <td className="py-2 text-sm text-text-secondary">{formatDate(inv.dueDate)}</td>
                        <td className="py-2 text-right text-sm font-semibold text-warning">{formatCurrency(inv.balance)}</td>
                        <td className="py-2 text-right text-sm text-danger">{inv.daysOverdue > 0 ? `${inv.daysOverdue} days` : 'Current'}</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* Expense Report */}
          {reportType === 'expense_report' && (
            <>
              <div className="flex items-center justify-between">
                <p className="section-title">Expense Report</p>
                <p className="text-sm font-semibold text-danger">Total: {formatCurrency(data.total)}</p>
              </div>
              {data.byCategory?.length > 0 && (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickFormatter={v => formatCurrency(v, true)} />
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    <Bar dataKey="total" fill="#E53935" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <table className="w-full">
                <thead><tr className="border-b border-border">
                  <th className="text-left py-2 table-header">Date</th>
                  <th className="text-left py-2 table-header">Category</th>
                  <th className="text-left py-2 table-header">Description</th>
                  <th className="text-right py-2 table-header">Amount</th>
                </tr></thead>
                <tbody>
                  {data.expenses?.map((e: any) => (
                    <tr key={e.id} className="border-b border-border/50">
                      <td className="py-2 text-sm text-text-secondary">{formatDate(e.date)}</td>
                      <td className="py-2 text-sm capitalize">{e.category}</td>
                      <td className="py-2 text-sm">{e.description}</td>
                      <td className="py-2 text-right text-sm font-semibold text-danger">{formatCurrency(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Cash Flow */}
          {reportType === 'cash_flow' && (
            <>
              <p className="section-title">Cash Flow Report</p>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-sm font-semibold text-success mb-3">Inflows (Payments Received)</p>
                  {data.inflows?.length === 0 ? <p className="text-sm text-text-muted">No inflows in this period</p> : (
                    <table className="w-full">
                      <thead><tr className="border-b border-border"><th className="text-left py-1.5 table-header">Period</th><th className="text-right py-1.5 table-header">Amount</th></tr></thead>
                      <tbody>{data.inflows?.map((r: any, i: number) => <tr key={i} className="border-b border-border/50"><td className="py-1.5 text-sm">{r.date?.substring(0,7)}</td><td className="py-1.5 text-right text-sm font-medium text-success">{formatCurrency(r.total)}</td></tr>)}</tbody>
                    </table>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-danger mb-3">Outflows (Expenses)</p>
                  {data.outflows?.length === 0 ? <p className="text-sm text-text-muted">No outflows in this period</p> : (
                    <table className="w-full">
                      <thead><tr className="border-b border-border"><th className="text-left py-1.5 table-header">Period</th><th className="text-right py-1.5 table-header">Amount</th></tr></thead>
                      <tbody>{data.outflows?.map((r: any, i: number) => <tr key={i} className="border-b border-border/50"><td className="py-1.5 text-sm">{r.date?.substring(0,7)}</td><td className="py-1.5 text-right text-sm font-medium text-danger">{formatCurrency(r.total)}</td></tr>)}</tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!data && (
        <div className="card p-16 flex flex-col items-center justify-center text-text-muted">
          <FileText size={40} className="mb-3 opacity-30" />
          <p className="text-sm">Select a report type and click "Run Report" to generate</p>
        </div>
      )}
    </div>
  )
}
