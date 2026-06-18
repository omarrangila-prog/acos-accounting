import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Trash2, Edit, DollarSign, RefreshCw, X, FileText } from 'lucide-react'
import { api } from '../lib/api'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/utils'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'

function Modal({ open, onClose, title, children }: any) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-0 rounded-2xl shadow-modal w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface-0">
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="btn-ghost !px-2 !py-2"><X size={16} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

const blankBill = { vendorName:'', billNumber:'', date: new Date().toISOString().split('T')[0], dueDate:'', amount:'', category:'general', notes:'' }
const blankPay  = { amount:'', date: new Date().toISOString().split('T')[0], method:'cash', reference:'' }

export function PayablesPage() {
  const { triggerRefresh, refreshKey } = useStore()
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [nextBillNum, setNextBillNum] = useState('BILL-0001')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [showPayment, setShowPayment] = useState<any>(null)
  const [form, setForm] = useState({ ...blankBill })
  const [payForm, setPayForm] = useState({ ...blankPay })

  const load = useCallback(() => {
    setLoading(true)
    api.getBills({ search: search||undefined, status: statusFilter||undefined }).then((b: any) => { setBills(b||[]); setLoading(false) })
  }, [search, statusFilter, refreshKey])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (showAdd && !editItem) api.getNextBillNumber().then((n: any) => { setNextBillNum(n); setForm(f=>({...f, billNumber:n})) }) }, [showAdd, editItem])

  const totalPayable = bills.filter(b => b.status !== 'paid').reduce((s, b) => s + (b.amount - b.paidAmount), 0)
  const overdue = bills.filter(b => b.status === 'overdue')

  const handleSave = async () => {
    if (!form.vendorName.trim()) return toast.error('Vendor name required')
    if (!form.amount) return toast.error('Amount required')
    if (!form.date) return toast.error('Date required')
    const res: any = editItem
      ? await api.updateBill(editItem.id, { ...form, amount: Number(form.amount) })
      : await api.addBill({ ...form, amount: Number(form.amount) })
    if (res?.success) { toast.success(editItem ? 'Bill updated' : 'Bill added'); setShowAdd(false); setEditItem(null); setForm({ ...blankBill }); triggerRefresh() }
    else toast.error('Failed')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bill? This cannot be undone.')) return
    const res: any = await api.deleteBill(id)
    if (res?.success) { toast.success('Bill deleted'); triggerRefresh() }
    else toast.error('Failed')
  }

  const handlePayment = async () => {
    if (!payForm.amount || !payForm.date) return toast.error('Amount and date required')
    const res: any = await api.recordBillPayment({ billId: showPayment.id, amount: Number(payForm.amount), date: payForm.date, method: payForm.method, reference: payForm.reference })
    if (res?.success) { toast.success('Payment recorded'); setShowPayment(null); setPayForm({ ...blankPay }); triggerRefresh() }
    else toast.error('Failed')
  }

  const CATS = ['general','rent','utilities','salaries','marketing','logistics','packaging','fuel','internet','other']

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-enter">
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Total Bills</p><p className="text-2xl font-bold">{bills.length}</p></div>
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Outstanding</p><p className="text-2xl font-bold text-danger">{formatCurrency(totalPayable, true)}</p></div>
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Overdue</p><p className="text-2xl font-bold text-danger">{overdue.length}</p></div>
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Paid Bills</p><p className="text-2xl font-bold text-success">{bills.filter(b=>b.status==='paid').length}</p></div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <p className="section-title">Bills & Payables</p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input placeholder="Search bill or vendor…" className="input pl-8 !py-1.5 text-xs w-52" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input !py-1.5 text-xs w-32" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {['pending','partial','paid','overdue'].map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
            </select>
            <button onClick={() => { setEditItem(null); setForm({ ...blankBill }); setShowAdd(true) }} className="btn-primary"><Plus size={15} /> Add Bill</button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-text-muted"><RefreshCw size={16} className="animate-spin" /><span className="text-sm">Loading...</span></div>
        ) : bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
            <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center"><FileText size={24} className="opacity-40" /></div>
            <p className="text-sm">No bills yet.</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary text-xs"><Plus size={13} /> Add Bill</button>
          </div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-border bg-surface-1">
              <th className="text-left px-5 py-3 table-header">Bill #</th>
              <th className="text-left px-5 py-3 table-header">Vendor</th>
              <th className="text-left px-5 py-3 table-header">Category</th>
              <th className="text-left px-5 py-3 table-header">Date</th>
              <th className="text-left px-5 py-3 table-header">Due</th>
              <th className="text-right px-5 py-3 table-header">Amount</th>
              <th className="text-right px-5 py-3 table-header">Paid</th>
              <th className="text-left px-5 py-3 table-header">Status</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody>
              {bills.map((b: any) => (
                <tr key={b.id} className="border-b border-border/50 hover:bg-surface-1/60 transition-colors group">
                  <td className="px-5 py-3.5 text-sm font-semibold text-accent">{b.billNumber}</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-text-primary">{b.vendorName}</td>
                  <td className="px-5 py-3.5"><span className="badge badge-neutral capitalize">{b.category}</span></td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">{formatDate(b.date)}</td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">{formatDate(b.dueDate)}</td>
                  <td className="px-5 py-3.5 text-right text-sm font-semibold">{formatCurrency(b.amount)}</td>
                  <td className="px-5 py-3.5 text-right text-sm text-success">{formatCurrency(b.paidAmount)}</td>
                  <td className="px-5 py-3.5"><span className={getStatusColor(b.status)}>{getStatusLabel(b.status)}</span></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {b.status !== 'paid' && (
                        <button onClick={() => { setShowPayment(b); setPayForm({ amount: String(b.amount-b.paidAmount), date: new Date().toISOString().split('T')[0], method:'cash', reference:'' }) }} className="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center hover:bg-success/20"><DollarSign size={13} /></button>
                      )}
                      <button onClick={() => { setEditItem(b); setForm({ vendorName:b.vendorName, billNumber:b.billNumber, date:b.date?.split('T')[0]||'', dueDate:b.dueDate?.split('T')[0]||'', amount:String(b.amount), category:b.category, notes:b.notes||'' }); setShowAdd(true) }} className="w-7 h-7 rounded-lg bg-surface-2 text-text-secondary flex items-center justify-center hover:bg-surface-3"><Edit size={13} /></button>
                      <button onClick={() => handleDelete(b.id)} className="w-7 h-7 rounded-lg bg-danger/10 text-danger flex items-center justify-center hover:bg-danger/20"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Bill */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditItem(null) }} title={editItem ? 'Edit Bill' : 'Add Bill'}>
        <div className="space-y-3">
          <div><label className="label">Vendor / Supplier Name *</label><input className="input" value={form.vendorName} onChange={e => setForm(p=>({...p,vendorName:e.target.value}))} placeholder="Who to pay" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Bill Number</label><input className="input font-mono" value={form.billNumber} onChange={e => setForm(p=>({...p,billNumber:e.target.value}))} /></div>
            <div><label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}>
                {CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} /></div>
            <div><label className="label">Due Date</label><input type="date" className="input" value={form.dueDate} onChange={e => setForm(p=>({...p,dueDate:e.target.value}))} /></div>
          </div>
          <div><label className="label">Amount (Rs.) *</label><input type="number" className="input text-lg" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} placeholder="0" /></div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => { setShowAdd(false); setEditItem(null) }}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>{editItem ? 'Save Changes' : 'Add Bill'}</button>
          </div>
        </div>
      </Modal>

      {/* Record Payment */}
      <Modal open={!!showPayment} onClose={() => setShowPayment(null)} title={`Record Payment — ${showPayment?.billNumber}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-surface-1 border border-border">
            <div><p className="text-xs text-text-muted mb-0.5">Bill Amount</p><p className="text-xl font-bold">{showPayment ? formatCurrency(showPayment.amount) : ''}</p></div>
            <div><p className="text-xs text-text-muted mb-0.5">Balance Due</p><p className="text-xl font-bold text-danger">{showPayment ? formatCurrency(showPayment.amount - showPayment.paidAmount) : ''}</p></div>
          </div>
          <div><label className="label">Amount *</label><input type="number" className="input text-lg font-semibold" value={payForm.amount} onChange={e => setPayForm(p=>({...p,amount:e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date *</label><input type="date" className="input" value={payForm.date} onChange={e => setPayForm(p=>({...p,date:e.target.value}))} /></div>
            <div><label className="label">Method</label>
              <select className="input" value={payForm.method} onChange={e => setPayForm(p=>({...p,method:e.target.value}))}>
                {['cash','bank_transfer','cheque','online','other'].map(m=><option key={m} value={m}>{m.replace('_',' ').toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Reference</label><input className="input" value={payForm.reference} onChange={e => setPayForm(p=>({...p,reference:e.target.value}))} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn-secondary" onClick={() => setShowPayment(null)}>Cancel</button>
            <button className="btn-primary" onClick={handlePayment}>Record Payment</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
