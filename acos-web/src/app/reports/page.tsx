'use client'

import { useState } from 'react'
import { FileText, Play, Download, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { downloadExcel } from '@/lib/export'
import { Loading } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'

const TYPES = [
  { value: 'pnl', label: 'Profit & Loss' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'receivables', label: 'Receivables' },
  { value: 'payables', label: 'Payables' },
  { value: 'pdc', label: 'PDC Report' },
  { value: 'ledger', label: 'Customer Ledger' },
]

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0]
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().split('T')[0]
  const [type, setType] = useState('pnl')
  const [from, setFrom] = useState(monthAgo)
  const [to, setTo] = useState(today)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [report, setReport] = useState<any>(null)

  const run = async () => {
    setLoading(true); setReport(null)
    try { setReport(await api.getReport({ type, from, to })) }
    catch (e: any) { toast.error(e.message || 'Failed') }
    finally { setLoading(false) }
  }

  const handleExport = async () => {
    if (!report) return
    setExporting(true)
    try {
      let columns: any[] = [], rows: any[] = []
      if (type === 'pnl') {
        columns = [{ header: 'Item', key: 'label', width: 30 }, { header: 'Amount', key: 'value', width: 18 }]
        rows = report.rows
      } else if (type === 'expenses') {
        columns = [{ header: 'Date', key: 'date', width: 14 }, { header: 'Category', key: 'category', width: 18 }, { header: 'Description', key: 'description', width: 30 }, { header: 'Amount', key: 'amount', width: 16 }]
        rows = report.rows.map((r: any) => ({ date: formatDate(r.date), category: r.category, description: r.description, amount: r.amount }))
      } else if (type === 'receivables' || type === 'payables') {
        columns = [{ header: 'Party', key: 'name', width: 26 }, { header: 'Phone', key: 'phone', width: 16 }, { header: 'Balance', key: 'balance', width: 16 }]
        rows = report.rows.map((r: any) => ({ name: r.name, phone: r.phone || '', balance: Math.abs(r.balance) }))
      } else if (type === 'pdc') {
        columns = [{ header: 'Party', key: 'partyName', width: 24 }, { header: 'Cheque #', key: 'chequeNumber', width: 16 }, { header: 'Bank', key: 'bank', width: 18 }, { header: 'Amount', key: 'amount', width: 16 }, { header: 'Status', key: 'status', width: 14 }]
        rows = report.rows.map((r: any) => ({ partyName: r.partyName, chequeNumber: r.chequeNumber || '', bank: r.bank || '', amount: r.amount, status: r.status }))
      } else if (type === 'ledger') {
        columns = [{ header: 'Party', key: 'name', width: 26 }, { header: 'Balance', key: 'balance', width: 16 }, { header: 'Transactions', key: 'txns', width: 14 }]
        rows = report.rows.map((r: any) => ({ name: r.name, balance: Math.abs(r.balance), txns: r.txns }))
      }
      await downloadExcel(`${report.title.replace(/[^a-z0-9]/gi, '_')}_${today}.xlsx`, report.title, columns, rows)
      toast.success('Exported')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  return (
    <div className="p-6 space-y-5 animate-enter">
      <div className="card p-5">
        <p className="section-title mb-4">Generate Report</p>
        <div className="flex items-end gap-4 flex-wrap">
          <div><label className="label">Report Type</label>
            <select className="input w-48" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div><label className="label">From Date</label><input type="date" className="input w-40" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="label">To Date</label><input type="date" className="input w-40" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <button onClick={run} className="btn-primary"><Play size={15} /> Run Report</button>
        </div>
      </div>

      <div className="card p-5 min-h-[300px]">
        {loading ? <Loading label="Generating report..." /> : !report ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-3">
            <FileText size={44} className="opacity-30" />
            <p className="text-sm">Select a report type and click "Run Report" to generate</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-text-primary">{report.title}</h3>
                <p className="text-xs text-text-muted">{formatDate(from)} — {formatDate(to)}</p>
              </div>
              <button onClick={handleExport} disabled={exporting} className="btn-secondary">
                {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />} Excel
              </button>
            </div>
            <ReportBody type={type} report={report} />
          </div>
        )}
      </div>
    </div>
  )
}

function ReportBody({ type, report }: any) {
  if (type === 'pnl') {
    return (
      <div className="space-y-2 max-w-md">
        {report.rows.map((r: any, i: number) => (
          <div key={i} className={`flex justify-between py-2 px-3 rounded-lg ${r.label === 'Net Profit' ? 'bg-surface-1 font-bold' : ''}`}>
            <span className="text-sm text-text-secondary">{r.label}</span>
            <span className={`text-sm font-semibold ${r.value >= 0 ? 'text-text-primary' : 'text-danger'}`}>{formatCurrency(r.value)}</span>
          </div>
        ))}
      </div>
    )
  }
  const cols: Record<string, { h: string; render: (r: any) => any }[]> = {
    expenses: [
      { h: 'Date', render: (r) => formatDate(r.date) },
      { h: 'Category', render: (r) => r.category },
      { h: 'Description', render: (r) => r.description },
      { h: 'Amount', render: (r) => formatCurrency(r.amount) },
    ],
    receivables: [{ h: 'Party', render: (r) => r.name }, { h: 'Phone', render: (r) => r.phone || '-' }, { h: 'Balance', render: (r) => formatCurrency(Math.abs(r.balance)) }],
    payables: [{ h: 'Party', render: (r) => r.name }, { h: 'Phone', render: (r) => r.phone || '-' }, { h: 'Balance', render: (r) => formatCurrency(Math.abs(r.balance)) }],
    pdc: [{ h: 'Party', render: (r) => r.partyName }, { h: 'Cheque #', render: (r) => r.chequeNumber || '-' }, { h: 'Bank', render: (r) => r.bank || '-' }, { h: 'Amount', render: (r) => formatCurrency(r.amount) }, { h: 'Status', render: (r) => r.status }],
    ledger: [{ h: 'Party', render: (r) => r.name }, { h: 'Balance', render: (r) => formatCurrency(Math.abs(r.balance)) }, { h: 'Transactions', render: (r) => r.txns }],
  }
  const c = cols[type] || []
  if (!report.rows?.length) return <p className="text-sm text-text-muted py-10 text-center">No data for this period.</p>
  return (
    <table className="w-full">
      <thead><tr className="border-b border-border bg-surface-1">{c.map((col) => <th key={col.h} className="text-left px-4 py-2 table-header">{col.h}</th>)}</tr></thead>
      <tbody>
        {report.rows.map((r: any, i: number) => (
          <tr key={i} className="border-b border-border/50"><td className="hidden" />{c.map((col) => <td key={col.h} className="px-4 py-2 text-sm text-text-secondary">{col.render(r)}</td>)}</tr>
        ))}
      </tbody>
      {report.total !== undefined && <tfoot><tr className="font-bold"><td className="px-4 py-2 text-sm" colSpan={c.length - 1}>Total</td><td className="px-4 py-2 text-sm">{formatCurrency(report.total)}</td></tr></tfoot>}
    </table>
  )
}
