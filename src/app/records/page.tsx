'use client'

import { useEffect, useState } from 'react'
import { Search, RefreshCw, Download, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { downloadExcel } from '@/lib/export'
import { useShell } from '@/components/AppShell'
import { Loading, Empty } from '@/components/ui'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { printTableReport, fmt } from '@/lib/print'

const MODULE_BADGE: Record<string, string> = {
  invoice: 'badge-accent', expense: 'badge-danger', pdc_payable: 'badge-warning', pdc_receivable: 'badge-success',
}

export default function RecordsPage() {
  const { refreshKey } = useShell()
  const [data, setData] = useState<any>({ records: [], counts: { total: 0, invoices: 0, expenses: 0, pdc: 0 } })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')

  const load = () => {
    setLoading(true)
    api.getRecords().then(setData).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }
  useEffect(load, [refreshKey])

  const records = (data.records || []).filter((r: any) => {
    if (tab !== 'all' && r.moduleKey !== tab) return false
    if (search) {
      const s = search.toLowerCase()
      return [r.title, r.party, r.module].some((x: string) => (x || '').toLowerCase().includes(s))
    }
    return true
  })

  const tabs = [
    { key: 'all', label: `All (${data.counts.total})` },
    { key: 'expense', label: `Expense (${data.counts.expenses})` },
    { key: 'invoice', label: `Invoice (${data.counts.invoices})` },
    { key: 'pdc_payable', label: 'PDC Payable' },
  ]

  const handleExport = async () => {
    setExporting(true)
    try {
      await downloadExcel(
        `All_Records_${new Date().toISOString().split('T')[0]}.xlsx`,
        'All Records',
        [
          { header: 'Date', key: 'date', width: 20 },
          { header: 'Module', key: 'module', width: 16 },
          { header: 'Title / Reference', key: 'title', width: 28 },
          { header: 'Customer / Vendor', key: 'party', width: 24 },
          { header: 'Status', key: 'status', width: 14 },
          { header: 'Amount', key: 'amount', width: 18 },
        ],
        (data.records || []).map((r: any) => {
          const dt = formatDateTime(r.date)
          return { date: `${dt.date} ${dt.time}`, module: r.module, title: r.title, party: r.party, status: r.status, amount: r.amount }
        }),
      )
      toast.success('Exported')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const handlePdf = () => {
    printTableReport(
      'All Records',
      [
        { header: 'Date', key: 'date' },
        { header: 'Module', key: 'module' },
        { header: 'Title / Reference', key: 'title' },
        { header: 'Customer / Vendor', key: 'party' },
        { header: 'Status', key: 'status' },
        { header: 'Amount', key: 'amount', align: 'right' },
      ],
      (data.records || []).map((r: any) => {
        const dt = formatDateTime(r.date)
        return { date: `${dt.date} ${dt.time}`, module: r.module, title: r.title, party: r.party, status: r.status, amount: fmt(r.amount) }
      }),
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-enter">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Total Records</p><p className="text-2xl font-bold">{data.counts.total}</p></div>
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Invoices</p><p className="text-2xl font-bold text-accent">{data.counts.invoices}</p></div>
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Expenses</p><p className="text-2xl font-bold text-danger">{data.counts.expenses}</p></div>
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">PDC Cheques</p><p className="text-2xl font-bold" style={{ color: '#8B5CF6' }}>{data.counts.pdc}</p></div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="section-title">Records by Module</p>
          <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting} className="btn-secondary text-xs !py-1.5">
            {exporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />} Excel
          </button>
          <button onClick={handlePdf} className="btn-secondary text-xs !py-1.5"><FileDown size={13} /> PDF</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? 'btn-primary text-xs !py-1.5' : 'btn-secondary text-xs !py-1.5'}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <p className="section-title">All Records <span className="text-text-muted font-normal text-sm">{records.length} records</span></p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input placeholder="Search anything..." className="input pl-8 !py-1.5 text-xs w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button onClick={load} className="btn-ghost !px-2.5 !py-2"><RefreshCw size={15} /></button>
          </div>
        </div>

        {loading ? <Loading /> : records.length === 0 ? <Empty title="No records found" /> : (
          <table className="rtable w-full">
            <thead><tr className="border-b border-border bg-surface-1">
              <th className="text-left px-5 py-3 table-header">Date & Time</th>
              <th className="text-left px-5 py-3 table-header">Module</th>
              <th className="text-left px-5 py-3 table-header">Title / Reference</th>
              <th className="text-left px-5 py-3 table-header">Customer / Vendor</th>
              <th className="text-left px-5 py-3 table-header">Status</th>
              <th className="text-right px-5 py-3 table-header">Amount</th>
            </tr></thead>
            <tbody>
              {records.map((r: any) => {
                const dt = formatDateTime(r.date)
                return (
                  <tr key={`${r.moduleKey}-${r.id}`} className="border-b border-border/50 hover:bg-surface-1/50">
                    <td data-label="Date & Time" className="px-5 py-3"><p className="text-sm text-text-secondary">{dt.date}</p><p className="text-xs text-text-muted">{dt.time}</p></td>
                    <td data-label="Module" className="px-5 py-3"><span className={`badge ${MODULE_BADGE[r.moduleKey] || 'badge-neutral'}`}>{r.module}</span></td>
                    <td data-label="Title" className="px-5 py-3 text-sm font-medium text-text-primary">{r.title}</td>
                    <td data-label="Customer / Vendor" className="px-5 py-3 text-sm text-text-secondary">{r.party}</td>
                    <td data-label="Status" className="px-5 py-3 text-sm">{r.status === 'pending' ? <span className="badge badge-warning">pending</span> : <span className="text-text-muted">{r.status}</span>}</td>
                    <td data-label="Amount" className="px-5 py-3 text-right text-sm font-semibold text-danger">{formatCurrency(r.amount)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
