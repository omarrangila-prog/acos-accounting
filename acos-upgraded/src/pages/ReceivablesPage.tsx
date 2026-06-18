import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Trash2, Edit, DollarSign, RefreshCw, X, Eye, User, Phone, Mail, MapPin, CreditCard } from 'lucide-react'
import { api } from '../lib/api'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/utils'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'

function Modal({ open, onClose, title, wide, children }: any) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-surface-0 rounded-2xl shadow-modal w-full max-h-[92vh] overflow-y-auto', wide ? 'max-w-2xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface-0 z-10">
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="btn-ghost !px-2 !py-2"><X size={16} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

const blankCust = { name:'',company:'',phone:'',whatsapp:'',email:'',address:'',ntn:'',creditLimit:'',openingBalance:'',notes:'' }

export function ReceivablesPage() {
  const { triggerRefresh, refreshKey } = useStore()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [viewItem, setViewItem] = useState<any>(null)
  const [viewData, setViewData] = useState<any>(null)
  const [showBalanceEdit, setShowBalanceEdit] = useState<any>(null)
  const [form, setForm] = useState({ ...blankCust })
  const [newBalance, setNewBalance] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.getCustomers(search || undefined).then((c: any) => { setCustomers(c || []); setLoading(false) })
  }, [search, refreshKey])

  useEffect(() => { load() }, [load])

  const openView = async (cust: any) => {
    setViewItem(cust)
    const d: any = await api.getCustomer(cust.id)
    setViewData(d)
  }

  const openEdit = (c: any) => {
    setEditItem(c)
    setForm({ name:c.name, company:c.company||'', phone:c.phone||'', whatsapp:c.whatsapp||'', email:c.email||'', address:c.address||'', ntn:c.ntn||'', creditLimit:String(c.creditLimit||''), openingBalance:'', notes:c.notes||'' })
    setShowAdd(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Customer name is required')
    const res: any = editItem
      ? await api.updateCustomer(editItem.id, { ...form, creditLimit: Number(form.creditLimit)||0 })
      : await api.addCustomer({ ...form, creditLimit: Number(form.creditLimit)||0, openingBalance: Number(form.openingBalance)||0 })
    if (res?.success) { toast.success(editItem ? 'Customer updated' : 'Customer added'); setShowAdd(false); setEditItem(null); setForm({ ...blankCust }); triggerRefresh() }
    else toast.error(res?.error || 'Failed')
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?\n\nThis cannot be undone.`)) return
    const res: any = await api.deleteCustomer(id)
    if (res?.success) { toast.success('Customer deleted'); if (viewItem?.id === id) setViewItem(null); triggerRefresh() }
    else toast.error(res?.error || 'Cannot delete — customer may have invoices')
  }

  const handleBalanceSave = async () => {
    if (newBalance === '') return toast.error('Enter a balance')
    const res: any = await api.updateCustomerBalance(showBalanceEdit.id, Number(newBalance))
    if (res?.success) { toast.success('Balance updated'); setShowBalanceEdit(null); setNewBalance(''); triggerRefresh() }
    else toast.error('Failed')
  }

  const totalReceivable = customers.reduce((s, c) => s + (c.currentBalance || 0), 0)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-enter">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Total Customers</p><p className="text-2xl font-bold text-text-primary">{customers.length}</p></div>
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Total Receivable</p><p className="text-2xl font-bold text-warning">{formatCurrency(totalReceivable, true)}</p></div>
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Customers with Balance</p><p className="text-2xl font-bold text-accent">{customers.filter(c => c.currentBalance > 0).length}</p></div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <p className="section-title">Customers</p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input placeholder="Search customer…" className="input pl-8 !py-1.5 text-xs w-52" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={() => { setEditItem(null); setForm({ ...blankCust }); setShowAdd(true) }} className="btn-primary">
              <Plus size={15} /> Add Customer
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-text-muted"><RefreshCw size={16} className="animate-spin" /><span className="text-sm">Loading...</span></div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
            <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center"><User size={24} className="opacity-40" /></div>
            <p className="text-sm">No customers yet. Add your first customer.</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary text-xs"><Plus size={13} /> Add Customer</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-1">
                <th className="text-left px-5 py-3 table-header">Customer</th>
                <th className="text-left px-5 py-3 table-header">Phone</th>
                <th className="text-left px-5 py-3 table-header">Email</th>
                <th className="text-right px-5 py-3 table-header">Credit Limit</th>
                <th className="text-right px-5 py-3 table-header">Balance</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c: any) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-surface-1/60 transition-colors group">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-semibold text-text-primary">{c.name}</p>
                    {c.company && <p className="text-xs text-text-muted">{c.company}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">{c.phone || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">{c.email || '—'}</td>
                  <td className="px-5 py-3.5 text-right text-sm text-text-secondary">{c.creditLimit > 0 ? formatCurrency(c.creditLimit) : '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => { setShowBalanceEdit(c); setNewBalance(String(c.currentBalance || 0)) }}
                      className={cn('text-sm font-bold hover:underline transition-colors', c.currentBalance > 0 ? 'text-warning' : 'text-success')}
                      title="Click to edit balance"
                    >
                      {formatCurrency(c.currentBalance || 0)}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openView(c)} title="View ledger" className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center hover:bg-accent/20"><Eye size={13} /></button>
                      <button onClick={() => openEdit(c)} title="Edit" className="w-7 h-7 rounded-lg bg-surface-2 text-text-secondary flex items-center justify-center hover:bg-surface-3"><Edit size={13} /></button>
                      <button onClick={() => handleDelete(c.id, c.name)} title="Delete" className="w-7 h-7 rounded-lg bg-danger/10 text-danger flex items-center justify-center hover:bg-danger/20"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add/Edit Customer Modal ── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditItem(null) }} title={editItem ? `Edit — ${editItem.name}` : 'Add Customer'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Customer Name *</label><input className="input" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Full name" /></div>
            <div><label className="label">Company</label><input className="input" value={form.company} onChange={e => setForm(p=>({...p,company:e.target.value}))} placeholder="Company name" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} /></div>
            <div><label className="label">WhatsApp</label><input className="input" value={form.whatsapp} onChange={e => setForm(p=>({...p,whatsapp:e.target.value}))} /></div>
          </div>
          <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} /></div>
          <div><label className="label">Address</label><textarea className="input" rows={2} value={form.address} onChange={e => setForm(p=>({...p,address:e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">NTN / CNIC</label><input className="input" value={form.ntn} onChange={e => setForm(p=>({...p,ntn:e.target.value}))} /></div>
            <div><label className="label">Credit Limit (Rs.)</label><input type="number" className="input" value={form.creditLimit} onChange={e => setForm(p=>({...p,creditLimit:e.target.value}))} /></div>
          </div>
          {!editItem && <div><label className="label">Opening Balance (Rs.)</label><input type="number" className="input" value={form.openingBalance} onChange={e => setForm(p=>({...p,openingBalance:e.target.value}))} placeholder="0" /></div>}
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => { setShowAdd(false); setEditItem(null) }}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>{editItem ? 'Save Changes' : 'Add Customer'}</button>
          </div>
        </div>
      </Modal>

      {/* ── Balance Edit Modal ── */}
      <Modal open={!!showBalanceEdit} onClose={() => setShowBalanceEdit(null)} title={`Edit Balance — ${showBalanceEdit?.name}`}>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface-1 border border-border">
            <p className="text-xs text-text-muted mb-0.5">Current Balance</p>
            <p className="text-2xl font-bold text-warning">{showBalanceEdit ? formatCurrency(showBalanceEdit.currentBalance||0) : ''}</p>
          </div>
          <div>
            <label className="label">New Balance (Rs.)</label>
            <input type="number" className="input text-lg font-semibold" value={newBalance} onChange={e => setNewBalance(e.target.value)} placeholder="0" />
            <p className="text-xs text-text-muted mt-1">Enter the correct outstanding balance for this customer.</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn-secondary" onClick={() => setShowBalanceEdit(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleBalanceSave}>Update Balance</button>
          </div>
        </div>
      </Modal>

      {/* ── Customer Ledger Modal ── */}
      <Modal open={!!viewItem} onClose={() => { setViewItem(null); setViewData(null) }} title={`Ledger — ${viewItem?.name}`} wide>
        {viewData ? (
          <div className="space-y-5">
            {/* Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4 space-y-2">
                {[
                  { icon: <User size={13} />, label: 'Name', val: viewData.customer?.name },
                  { icon: <Phone size={13} />, label: 'Phone', val: viewData.customer?.phone },
                  { icon: <Mail size={13} />, label: 'Email', val: viewData.customer?.email },
                  { icon: <MapPin size={13} />, label: 'Address', val: viewData.customer?.address },
                ].map((r, i) => r.val && (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-text-muted mt-0.5 flex-shrink-0">{r.icon}</span>
                    <span className="text-text-secondary font-medium w-14 flex-shrink-0">{r.label}</span>
                    <span className="text-text-primary">{r.val}</span>
                  </div>
                ))}
              </div>
              <div className="card p-4 space-y-3">
                <div><p className="text-xs text-text-muted mb-0.5">Current Balance</p><p className="text-2xl font-bold text-warning">{formatCurrency(viewData.customer?.currentBalance||0)}</p></div>
                <div><p className="text-xs text-text-muted mb-0.5">Total Invoiced</p><p className="text-base font-semibold text-text-primary">{formatCurrency(viewData.invoices?.reduce((s:number,i:any)=>s+i.amount,0)||0)}</p></div>
                <div><p className="text-xs text-text-muted mb-0.5">Total Received</p><p className="text-base font-semibold text-success">{formatCurrency(viewData.payments?.reduce((s:number,p:any)=>s+p.amount,0)||0)}</p></div>
              </div>
            </div>

            {/* Invoices */}
            <div>
              <p className="text-sm font-semibold text-text-primary mb-2">Invoices ({viewData.invoices?.length||0})</p>
              {viewData.invoices?.length === 0 ? <p className="text-sm text-text-muted">No invoices</p> : (
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border bg-surface-1">
                    <th className="text-left px-3 py-2 table-header">Invoice</th>
                    <th className="text-left px-3 py-2 table-header">Date</th>
                    <th className="text-right px-3 py-2 table-header">Amount</th>
                    <th className="text-right px-3 py-2 table-header">Paid</th>
                    <th className="text-left px-3 py-2 table-header">Status</th>
                  </tr></thead>
                  <tbody>
                    {viewData.invoices?.map((inv:any) => (
                      <tr key={inv.id} className="border-b border-border/50">
                        <td className="px-3 py-2 font-medium text-accent">{inv.invoiceNumber}</td>
                        <td className="px-3 py-2 text-text-secondary">{formatDate(inv.date)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(inv.amount)}</td>
                        <td className="px-3 py-2 text-right text-success">{formatCurrency(inv.paidAmount)}</td>
                        <td className="px-3 py-2"><span className={getStatusColor(inv.status)}>{getStatusLabel(inv.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Payments */}
            <div>
              <p className="text-sm font-semibold text-text-primary mb-2">Payment History ({viewData.payments?.length||0})</p>
              {viewData.payments?.length === 0 ? <p className="text-sm text-text-muted">No payments</p> : (
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border bg-surface-1">
                    <th className="text-left px-3 py-2 table-header">Date</th>
                    <th className="text-left px-3 py-2 table-header">Method</th>
                    <th className="text-left px-3 py-2 table-header">Reference</th>
                    <th className="text-right px-3 py-2 table-header">Amount</th>
                  </tr></thead>
                  <tbody>
                    {viewData.payments?.map((p:any) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="px-3 py-2 text-text-secondary">{formatDate(p.date)}</td>
                        <td className="px-3 py-2 capitalize">{p.method?.replace('_',' ')}</td>
                        <td className="px-3 py-2 text-text-secondary">{p.reference||'—'}</td>
                        <td className="px-3 py-2 text-right font-semibold text-success">{formatCurrency(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => handleDelete(viewItem.id, viewItem.name)} className="btn-secondary text-danger text-sm"><Trash2 size={13} /> Delete Customer</button>
              <button onClick={() => { openEdit(viewItem); setViewItem(null); setViewData(null) }} className="btn-primary text-sm"><Edit size={13} /> Edit Customer</button>
            </div>
          </div>
        ) : <div className="flex items-center justify-center py-12 gap-2 text-text-muted"><RefreshCw size={16} className="animate-spin" /><span className="text-sm">Loading...</span></div>}
      </Modal>
    </div>
  )
}
