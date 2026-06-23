'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Search, Trash2, Edit, Download, RefreshCw, FileDown, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { downloadExcel } from '@/lib/export'
import { printTableReport, fmt } from '@/lib/print'
import { useShell } from '@/components/AppShell'
import { Modal, Loading, Empty, DetailModal } from '@/components/ui'
import { formatCurrency, formatDate, toDateInput } from '@/lib/utils'

const blank = { customerName: '', date: new Date().toISOString().split('T')[0], dueDate: '', amount: '', paidAmount: '', notes: '' }
const STATUS_BADGE: Record<string, string> = { paid: 'badge-success', partial: 'badge-warning', overdue: 'badge-danger', unpaid: 'badge-neutral' }

export default function InvoicesPage() {
  const { refreshKey } = useShell()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [viewItem, setViewItem] = useState<any>(null)
  const [form, setForm] = useState({ ...blank })

  const load = useCallback(() => {
    setLoading(true)
    api.getInvoices({ search: search || undefined, status: status || undefined })
      .then((i) => setInvoices(i || [])).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [search, status])
  useEffect(() => { load() }, [search, status, refreshKey, load])

  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0)
  const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0)
  const overdue = invoices.filter((i) => i.status === 'overdue').length

  const save = async () => {
    if (!form.amount) return toast.error('Amount required')
    try {
      const payload = { ...form, amount: Number(form.amount), paidAmount: Number(form.paidAmount) || 0 }
      const res = editItem ? await api.updateInvoice(editItem.id, payload) : await api.addInvoice(payload)
      if (res?.success) { toast.success(editItem ? 'Updated' : 'Invoice created'); setShowAdd(false); setEditItem(null); setForm({ ...blank }); load() }
    } catch (e: any) { toast.error(e.message || 'Failed') }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this invoice?')) return
    try { await api.deleteInvoice(id); toast.success('Deleted'); load() }
    catch (e: any) { toast.error(e.message || 'Failed') }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const all = await api.getInvoices()
      await downloadExcel(
        `Invoices_${new Date().toISOString().split('T')[0]}.xlsx`,
        'Invoices',
        [
          { header: 'Invoice #', key: 'invoiceNumber', width: 16 },
          { header: 'Customer', key: 'customerName', width: 24 },
          { header: 'Date', key: 'date', width: 14 },
          { header: 'Due Date', key: 'dueDate', width: 14 },
          { header: 'Amount', key: 'amount', width: 16 },
          { header: 'Paid', key: 'paidAmount', width: 16 },
          { header: 'Status', key: 'status', width: 14 },
        ],
        (all || []).map((i: any) => ({
          invoiceNumber: i.invoiceNumber, customerName: i.customerName || '', date: formatDate(i.date),
          dueDate: formatDate(i.dueDate), amount: i.amount, paidAmount: i.paidAmount, status: i.status,
        })),
      )
      toast.success('Exported')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const handlePdf = async () => {
    setExporting(true)
    try {
      const all = await api.getInvoices() // all records
      printTableReport(
        'Invoices Report',
        [
          { header: 'Invoice #', key: 'invoiceNumber' },
          { header: 'Customer', key: 'customerName' },
          { header: 'Date', key: 'date' },
          { header: 'Due', key: 'dueDate' },
          { header: 'Status', key: 'status' },
          { header: 'Paid', key: 'paid', align: 'right' },
          { header: 'Amount', key: 'amount', align: 'right' },
        ],
        (all || []).map((i: any) => ({
          invoiceNumber: i.invoiceNumber, customerName: i.customerName || '-', date: formatDate(i.date),
          dueDate: formatDate(i.dueDate), status: i.status, paid: fmt(i.paidAmount), amount: fmt(i.amount),
        })),
        { total: { label: 'Total Billed', value: fmt((all || []).reduce((s: number, i: any) => s + i.amount, 0)) } },
      )
    } catch { toast.error('PDF failed') }
    finally { setExporting(false) }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-enter">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-stat p-4 sm:p-5"><p className="text-xs text-text-muted mb-1">Total Invoices</p><p className="text-2xl font-bold">{invoices.length}</p></div>
        <div className="card-stat p-4 sm:p-5"><p className="text-xs text-text-muted mb-1">Total Billed</p><p className="text-2xl font-bold text-accent">{formatCurrency(totalBilled, true)}</p></div>
        <div className="card-stat p-4 sm:p-5"><p className="text-xs text-text-muted mb-1">Total Collected</p><p className="text-2xl font-bold text-success">{formatCurrency(totalCollected, true)}</p></div>
        <div className="card-stat p-4 sm:p-5"><p className="text-xs text-text-muted mb-1">Overdue</p><p className="text-2xl font-bold text-danger">{overdue}</p></div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between px-4 sm:px-5 py-3 border-b border-border gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input placeholder="Search invoice or customer..." className="input pl-8 !py-1.5 text-xs w-full lg:w-60" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input !py-1.5 text-xs flex-1 min-w-[120px] lg:w-32 lg:flex-none" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Status</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleExport} disabled={exporting} className="btn-secondary text-xs !py-1.5">
              {exporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />} Excel
            </button>
            <button onClick={handlePdf} disabled={exporting} className="btn-secondary text-xs !py-1.5"><FileDown size={13} /> PDF</button>
            <button onClick={() => { setEditItem(null); setForm({ ...blank }); setShowAdd(true) }} className="btn-primary text-xs !py-1.5"><Plus size={13} /> Create Invoice</button>
          </div>
        </div>

        {loading ? <Loading /> : invoices.length === 0 ? <Empty aria-label="No invoices yet." title="No invoices yet." /> : (
          <table className="rtable w-full">
            <thead><tr className="border-b border-border bg-surface-1">
              <th className="text-left px-5 py-3 table-header">Invoice #</th>
              <th className="text-left px-5 py-3 table-header">Customer</th>
              <th className="text-left px-5 py-3 table-header">Date</th>
              <th className="text-left px-5 py-3 table-header">Due</th>
              <th className="text-right px-5 py-3 table-header">Amount</th>
              <th className="text-right px-5 py-3 table-header">Paid</th>
              <th className="text-left px-5 py-3 table-header">Status</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b border-border/50 hover:bg-surface-1/50">
                  <td data-label="Invoice #" className="px-5 py-3 text-sm font-medium text-text-primary">{i.invoiceNumber}</td>
                  <td data-label="Customer" className="px-5 py-3 text-sm text-text-secondary">{i.customerName || '-'}</td>
                  <td data-label="Date" className="px-5 py-3 text-sm text-text-secondary">{formatDate(i.date)}</td>
                  <td data-label="Due" className="px-5 py-3 text-sm text-text-secondary">{formatDate(i.dueDate)}</td>
                  <td data-label="Amount" className="px-5 py-3 text-right text-sm font-semibold">{formatCurrency(i.amount)}</td>
                  <td data-label="Paid" className="px-5 py-3 text-right text-sm text-success">{formatCurrency(i.paidAmount)}</td>
                  <td data-label="Status" className="px-5 py-3"><span className={`badge ${STATUS_BADGE[i.status]}`}>{i.status}</span></td>
                  <td className="px-5 py-3 cell-actions">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setViewItem(i)} aria-label="View" title="View" className="btn-ghost !px-2 !py-1.5"><Eye size={15} /></button>
                      <button onClick={() => { setEditItem(i); setForm({ customerName: i.customerName || '', date: toDateInput(i.date), dueDate: toDateInput(i.dueDate), amount: String(i.amount), paidAmount: String(i.paidAmount), notes: i.notes || '' }); setShowAdd(true) }} aria-label="Edit" title="Edit" className="btn-ghost !px-2 !py-1.5"><Edit size={15} /></button>
                      <button onClick={() => remove(i.id)} aria-label="Delete" title="Delete" className="btn-ghost !px-2 !py-1.5 text-danger"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditItem(null) }} title={editItem ? 'Edit Invoice' : 'Create Invoice'}>
        <div className="space-y-3">
          <div><label className="label">Customer Name</label><input className="input" value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} /></div>
            <div><label className="label">Due Date</label><input type="date" className="input" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount *</label><input type="number" className="input" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></div>
            <div><label className="label">Paid Amount</label><input type="number" className="input" value={form.paidAmount} onChange={(e) => setForm((p) => ({ ...p, paidAmount: e.target.value }))} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => { setShowAdd(false); setEditItem(null) }}>Cancel</button>
            <button className="btn-primary" onClick={save}>{editItem ? 'Save Changes' : 'Create Invoice'}</button>
          </div>
        </div>
      </Modal>

      <DetailModal open={!!viewItem} onClose={() => setViewItem(null)} aria-label="Invoice Details" title="Invoice Details" rows={viewItem ? [
        { label: 'Invoice #', value: viewItem.invoiceNumber },
        { label: 'Customer', value: viewItem.customerName || '-' },
        { label: 'Date', value: formatDate(viewItem.date) },
        { label: 'Due Date', value: formatDate(viewItem.dueDate) },
        { label: 'Amount', value: formatCurrency(viewItem.amount) },
        { label: 'Paid', value: formatCurrency(viewItem.paidAmount) },
        { label: 'Balance', value: formatCurrency(viewItem.amount - viewItem.paidAmount) },
        { label: 'Status', value: viewItem.status },
        { label: 'Notes', value: viewItem.notes || '-' },
      ] : []} />
    </div>
  )
}
