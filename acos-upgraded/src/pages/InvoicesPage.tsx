import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Plus, Search, Trash2, Eye, X, Printer, Download,
  CheckCircle, Clock, AlertTriangle, FileText, RefreshCw, DollarSign
} from 'lucide-react'
import { api } from '../lib/api'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/utils'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'

/* ─── Modal shell ─────────────────────────────────────────── */
function Modal({ open, onClose, title, wide, children }: any) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-surface-0 rounded-2xl shadow-modal w-full max-h-[92vh] overflow-y-auto', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface-0 z-10">
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="btn-ghost !px-2 !py-2"><X size={16} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

/* ─── Status badge ────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:   { label: 'Draft',    color: 'bg-slate-100 text-slate-500',   icon: <FileText size={11} /> },
  pending: { label: 'Pending',  color: 'bg-amber-50 text-amber-600',    icon: <Clock size={11} /> },
  paid:    { label: 'Paid',     color: 'bg-emerald-50 text-emerald-600',icon: <CheckCircle size={11} /> },
  partial: { label: 'Partial',  color: 'bg-blue-50 text-blue-600',      icon: <DollarSign size={11} /> },
  overdue: { label: 'Overdue',  color: 'bg-red-50 text-red-600',        icon: <AlertTriangle size={11} /> },
}
function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] || { label: status, color: 'bg-slate-100 text-slate-500', icon: null }
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', m.color)}>
      {m.icon}{m.label}
    </span>
  )
}

/* ─── Invoice print view ──────────────────────────────────── */
function InvoicePrintView({ inv, settings }: { inv: any; settings: any }) {
  const items = (() => { try { return JSON.parse(inv.items || '[]') } catch { return [] } })()
  const subtotal = items.reduce((s: number, i: any) => s + (Number(i.qty) * Number(i.rate)), 0)
  const taxAmt = items.reduce((s: number, i: any) => s + (Number(i.qty) * Number(i.rate) * (Number(i.tax) / 100)), 0)
  const grand = subtotal + taxAmt

  return (
    <div className="bg-white p-8 text-sm text-gray-800 font-sans" id="invoice-print">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-5 border-b border-gray-200">
        <div>
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-3">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <p className="font-bold text-lg text-gray-900">{settings?.companyName || 'My Business'}</p>
          {settings?.address && <p className="text-xs text-gray-500 mt-0.5">{settings.address}</p>}
          {settings?.phone && <p className="text-xs text-gray-500">{settings.phone}</p>}
          {settings?.email && <p className="text-xs text-gray-500">{settings.email}</p>}
          {settings?.ntn && <p className="text-xs text-gray-500">NTN: {settings.ntn}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-600">{inv.invoiceNumber}</p>
          <div className="mt-2 space-y-1 text-xs text-gray-500">
            <p><span className="font-medium text-gray-700">Date:</span> {formatDate(inv.date)}</p>
            <p><span className="font-medium text-gray-700">Due Date:</span> {formatDate(inv.dueDate)}</p>
            <p><span className="font-medium text-gray-700">Status:</span> <span className="capitalize">{inv.status}</span></p>
          </div>
        </div>
      </div>

      {/* Bill to */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bill To</p>
        <p className="font-semibold text-gray-900">{inv.customerName}</p>
        {inv.customerPhone && <p className="text-xs text-gray-500 mt-0.5">{inv.customerPhone}</p>}
      </div>

      {/* Items table */}
      <table className="w-full mb-6">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="text-left px-4 py-2.5 text-xs font-semibold rounded-l-lg">Item</th>
            <th className="text-center px-4 py-2.5 text-xs font-semibold">Qty</th>
            <th className="text-center px-4 py-2.5 text-xs font-semibold">UOM</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold">Rate</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold">Tax %</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold">Tax Amt</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold rounded-r-lg">Net Amt</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? items.map((item: any, i: number) => {
            const lineTotal = Number(item.qty) * Number(item.rate)
            const lineTax = lineTotal * (Number(item.tax || 0) / 100)
            return (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2.5 text-sm">{item.description}</td>
                <td className="px-4 py-2.5 text-center text-sm">{item.qty}</td>
                <td className="px-4 py-2.5 text-center text-sm text-gray-500">{item.uom || 'PCS'}</td>
                <td className="px-4 py-2.5 text-right text-sm">{formatCurrency(Number(item.rate))}</td>
                <td className="px-4 py-2.5 text-right text-sm text-gray-500">{item.tax || 0}%</td>
                <td className="px-4 py-2.5 text-right text-sm">{formatCurrency(lineTax)}</td>
                <td className="px-4 py-2.5 text-right text-sm font-medium">{formatCurrency(lineTotal + lineTax)}</td>
              </tr>
            )
          }) : (
            <tr><td colSpan={7} className="px-4 py-3 text-center text-gray-400 text-sm italic">No line items</td></tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>GST / Tax</span><span>{formatCurrency(taxAmt)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
            <span>Grand Total</span><span>{formatCurrency(grand || inv.amount)}</span>
          </div>
          {inv.paidAmount > 0 && (
            <>
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Paid</span><span>− {formatCurrency(inv.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-red-600 pt-1 border-t border-gray-200">
                <span>Balance Due</span><span>{formatCurrency((grand || inv.amount) - inv.paidAmount)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      {inv.notes && (
        <div className="p-4 bg-blue-50 rounded-xl mb-6">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-700">{inv.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
        Thank you for your business — {settings?.companyName || 'My Business'}
        {settings?.email && <span> · {settings.email}</span>}
      </div>
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────── */
const blankItem = { description: '', qty: '1', uom: 'PCS', rate: '', tax: '0' }

export function InvoicesPage() {
  const { triggerRefresh, refreshKey } = useStore()
  const [invoices, setInvoices] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [viewInv, setViewInv] = useState<any>(null)
  const [showPayment, setShowPayment] = useState<any>(null)

  const [nextNum, setNextNum] = useState('INV-0001')
  const [items, setItems] = useState([{ ...blankItem }])
  const [form, setForm] = useState({
    customerId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0],
    dueDate: '', status: 'pending', notes: ''
  })
  const [payForm, setPayForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], method: 'cash', reference: '' })

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.getInvoices({ search: search || undefined, status: statusFilter || undefined }),
      api.getCustomers(),
      api.getSettings(),
    ]).then(([inv, cust, sett]: any) => {
      setInvoices(inv || [])
      setCustomers(cust || [])
      setSettings(sett || {})
      setLoading(false)
    })
  }, [search, statusFilter, refreshKey])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (showCreate) api.getNextInvoiceNumber().then((n: any) => { setNextNum(n); setForm(f => ({ ...f, invoiceNumber: n })) })
  }, [showCreate])

  /* line item helpers */
  const addItem = () => setItems(p => [...p, { ...blankItem }])
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i))
  const updateItem = (i: number, key: string, val: string) => setItems(p => p.map((item, idx) => idx === i ? { ...item, [key]: val } : item))

  const subtotal = items.reduce((s, it) => s + (Number(it.qty) * Number(it.rate || 0)), 0)
  const taxTotal = items.reduce((s, it) => s + (Number(it.qty) * Number(it.rate || 0) * (Number(it.tax || 0) / 100)), 0)
  const grandTotal = subtotal + taxTotal

  const handleCreate = async () => {
    if (!form.customerId) return toast.error('Select a customer')
    if (items.every(it => !it.description && !it.rate)) return toast.error('Add at least one item')
    const res: any = await api.addInvoice({
      ...form,
      invoiceNumber: form.invoiceNumber || nextNum,
      amount: grandTotal,
      items: JSON.stringify(items),
      status: form.status,
    })
    if (res?.success) {
      toast.success('Invoice created!')
      setShowCreate(false)
      setItems([{ ...blankItem }])
      setForm({ customerId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], dueDate: '', status: 'pending', notes: '' })
      triggerRefresh()
    } else toast.error(res?.error || 'Failed to create invoice')
  }

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Delete invoice ${num}? This cannot be undone.`)) return
    const res: any = await api.deleteInvoice(id)
    if (res?.success) { toast.success('Invoice deleted'); triggerRefresh() }
    else toast.error(res?.error || 'Cannot delete')
  }

  const handlePayment = async () => {
    if (!payForm.amount || !payForm.date) return toast.error('Amount and date required')
    const max = showPayment.amount - showPayment.paidAmount
    if (Number(payForm.amount) > max) return toast.error(`Max payment is ${formatCurrency(max)}`)
    const res: any = await api.recordPayment({ invoiceId: showPayment.id, amount: Number(payForm.amount), date: payForm.date, method: payForm.method, reference: payForm.reference })
    if (res?.success) { toast.success('Payment recorded'); setShowPayment(null); setPayForm({ amount: '', date: new Date().toISOString().split('T')[0], method: 'cash', reference: '' }); triggerRefresh() }
    else toast.error('Failed')
  }

  const handlePrint = () => window.print()

  /* stats */
  const totalAmount = invoices.reduce((s, i) => s + i.amount, 0)
  const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0)
  const overdue = invoices.filter(i => i.status === 'overdue')

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-enter">

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: invoices.length, className: 'text-text-primary' },
          { label: 'Total Billed', value: formatCurrency(totalAmount, true), className: 'text-accent' },
          { label: 'Total Collected', value: formatCurrency(totalPaid, true), className: 'text-success' },
          { label: 'Overdue', value: overdue.length, sub: overdue.length ? formatCurrency(overdue.reduce((s,i)=>s+i.amount-i.paidAmount,0), true) : null, className: 'text-danger' },
        ].map((s, i) => (
          <div key={i} className="card p-5">
            <p className="text-xs text-text-muted mb-1">{s.label}</p>
            <p className={cn('text-2xl font-bold', s.className)}>{s.value}</p>
            {s.sub && <p className="text-xs text-danger mt-0.5">{s.sub} outstanding</p>}
          </div>
        ))}
      </div>

      {/* ── Table card ── */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                placeholder="Search invoice or customer…"
                className="input pl-8 !py-1.5 text-xs w-56"
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input !py-1.5 text-xs w-32"
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary"
          >
            <Plus size={15} /> Create Invoice
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-text-muted gap-2">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Loading...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-3">
            <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center">
              <FileText size={24} className="opacity-40" />
            </div>
            <p className="text-sm">No invoices found. Create your first invoice.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-xs"><Plus size={13} /> Create Invoice</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-1">
                <th className="text-left px-5 py-3 table-header">Invoice #</th>
                <th className="text-left px-5 py-3 table-header">Customer</th>
                <th className="text-left px-5 py-3 table-header">Date</th>
                <th className="text-left px-5 py-3 table-header">Due</th>
                <th className="text-right px-5 py-3 table-header">Amount</th>
                <th className="text-right px-5 py-3 table-header">Paid</th>
                <th className="text-right px-5 py-3 table-header">Balance</th>
                <th className="text-left px-5 py-3 table-header">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-border/50 hover:bg-surface-1/60 transition-colors group">
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-semibold text-accent">{inv.invoiceNumber}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-text-primary">{inv.customerName}</p>
                    {inv.customerPhone && <p className="text-xs text-text-muted">{inv.customerPhone}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">{formatDate(inv.date)}</td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">{formatDate(inv.dueDate)}</td>
                  <td className="px-5 py-3.5 text-right text-sm font-semibold text-text-primary">{formatCurrency(inv.amount)}</td>
                  <td className="px-5 py-3.5 text-right text-sm font-medium text-success">{formatCurrency(inv.paidAmount)}</td>
                  <td className="px-5 py-3.5 text-right text-sm font-semibold text-warning">{formatCurrency(inv.amount - inv.paidAmount)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={inv.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="View Invoice"
                        onClick={() => setViewInv(inv)}
                        className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center hover:bg-accent/20 transition-colors"
                      >
                        <Eye size={13} />
                      </button>
                      {inv.status !== 'paid' && (
                        <button
                          title="Record Payment"
                          onClick={() => { setShowPayment(inv); setPayForm({ amount: String(inv.amount - inv.paidAmount), date: new Date().toISOString().split('T')[0], method: 'cash', reference: '' }) }}
                          className="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition-colors"
                        >
                          <DollarSign size={13} />
                        </button>
                      )}
                      <button
                        title="Delete Invoice"
                        onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                        className="w-7 h-7 rounded-lg bg-danger/10 text-danger flex items-center justify-center hover:bg-danger/20 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ CREATE INVOICE MODAL ══ */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Invoice" wide>
        <div className="space-y-5">
          {/* Top row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Customer *</label>
              <select className="input" value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}>
                <option value="">Select customer…</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Invoice Number</label>
              <input className="input font-mono" value={form.invoiceNumber} onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Invoice Date *</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
              </select>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Line Items</label>
              <button onClick={addItem} className="btn-ghost !py-1 !px-2 text-xs text-accent"><Plus size={12} /> Add Item</button>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-1 border-b border-border">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-text-muted">Description</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-text-muted w-16">Qty</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-text-muted w-20">UOM</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-text-muted w-28">Rate</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-text-muted w-20">Tax %</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-text-muted w-28">Net Amt</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const net = Number(item.qty) * Number(item.rate || 0)
                    const tax = net * (Number(item.tax || 0) / 100)
                    return (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="px-3 py-2">
                          <input className="input !py-1 text-xs" placeholder="Item description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" className="input !py-1 text-xs text-center" min="1" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <input className="input !py-1 text-xs text-center" placeholder="PCS" value={item.uom} onChange={e => updateItem(i, 'uom', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" className="input !py-1 text-xs text-right" placeholder="0.00" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" className="input !py-1 text-xs text-right" placeholder="0" value={item.tax} onChange={e => updateItem(i, 'tax', e.target.value)} />
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-medium text-text-primary pr-3">{formatCurrency(net + tax)}</td>
                        <td className="pr-2">
                          {items.length > 1 && (
                            <button onClick={() => removeItem(i)} className="w-5 h-5 rounded-md hover:bg-danger/10 text-danger flex items-center justify-center">
                              <X size={11} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mt-3">
              <div className="w-56 space-y-1.5 text-sm">
                <div className="flex justify-between text-text-secondary"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-text-secondary"><span>Tax / GST</span><span>{formatCurrency(taxTotal)}</span></div>
                <div className="flex justify-between font-bold text-text-primary pt-1.5 border-t border-border">
                  <span>Grand Total</span><span className="text-accent">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes / Terms</label>
            <textarea className="input" rows={2} placeholder="e.g. Payment due within 30 days…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate}><FileText size={14} /> Create Invoice</button>
          </div>
        </div>
      </Modal>

      {/* ══ VIEW / PRINT MODAL ══ */}
      <Modal open={!!viewInv} onClose={() => setViewInv(null)} title={viewInv?.invoiceNumber || 'Invoice'} wide>
        {viewInv && (
          <>
            <div className="flex justify-end gap-2 mb-4">
              <button className="btn-secondary text-xs !py-1.5" onClick={handlePrint}><Printer size={13} /> Print</button>
            </div>
            <InvoicePrintView inv={viewInv} settings={settings} />
          </>
        )}
      </Modal>

      {/* ══ RECORD PAYMENT MODAL ══ */}
      <Modal open={!!showPayment} onClose={() => setShowPayment(null)} title={`Record Payment — ${showPayment?.invoiceNumber}`}>
        <div className="space-y-4">
          <div className="flex gap-3 p-4 rounded-xl bg-surface-1 border border-border">
            <div className="flex-1">
              <p className="text-xs text-text-muted mb-0.5">Total Amount</p>
              <p className="text-lg font-bold text-text-primary">{showPayment ? formatCurrency(showPayment.amount) : ''}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-text-muted mb-0.5">Already Paid</p>
              <p className="text-lg font-bold text-success">{showPayment ? formatCurrency(showPayment.paidAmount) : ''}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-text-muted mb-0.5">Balance Due</p>
              <p className="text-lg font-bold text-warning">{showPayment ? formatCurrency(showPayment.amount - showPayment.paidAmount) : ''}</p>
            </div>
          </div>

          <div>
            <label className="label">Payment Amount *</label>
            <input type="number" className="input text-lg font-semibold" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={payForm.date} onChange={e => setPayForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Method</label>
              <select className="input" value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}>
                {['cash','bank_transfer','cheque','online','other'].map(m => <option key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Reference / Cheque No.</label>
            <input className="input" value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn-secondary" onClick={() => setShowPayment(null)}>Cancel</button>
            <button className="btn-primary" onClick={handlePayment}><CheckCircle size={14} /> Confirm Payment</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
