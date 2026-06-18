import React, { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw, X, CreditCard, CheckCircle, XCircle } from 'lucide-react'
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
      <div className="relative bg-surface-0 rounded-2xl shadow-modal w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="btn-ghost !px-2 !py-2"><X size={16} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function PDCPage() {
  const { triggerRefresh, refreshKey } = useStore()
  const [tab, setTab] = useState<'receivable'|'payable'>('receivable')
  const [pdcRec, setPdcRec] = useState<any[]>([])
  const [pdcPay, setPdcPay] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [recForm, setRecForm] = useState({ customerId: '', checkNumber: '', bank: '', amount: '', issueDate: '', depositDate: '', notes: '' })
  const [payForm, setPayForm] = useState({ supplierId: '', checkNumber: '', bank: '', amount: '', issueDate: '', dueDate: '', notes: '' })

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([api.getPDCReceivable(), api.getPDCPayable(), api.getCustomers(), api.getSuppliers()]).then(([r, p, c, s]: any) => {
      setPdcRec(r || []); setPdcPay(p || []); setCustomers(c || []); setSuppliers(s || []); setLoading(false)
    })
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const totalRec = pdcRec.filter((p: any) => ['pending','deposited'].includes(p.status)).reduce((s: number, p: any) => s + p.amount, 0)
  const totalPay = pdcPay.filter((p: any) => ['pending','presented'].includes(p.status)).reduce((s: number, p: any) => s + p.amount, 0)

  const handleAddRec = async () => {
    if (!recForm.customerId || !recForm.amount || !recForm.depositDate) return toast.error('Fill required fields')
    const res: any = await api.addPDCReceivable({ ...recForm, amount: Number(recForm.amount) })
    if (res?.success) { toast.success('PDC Receivable added'); setShowAdd(false); setRecForm({ customerId: '', checkNumber: '', bank: '', amount: '', issueDate: '', depositDate: '', notes: '' }); triggerRefresh() }
    else toast.error('Failed')
  }

  const handleAddPay = async () => {
    if (!payForm.supplierId || !payForm.amount || !payForm.dueDate) return toast.error('Fill required fields')
    const res: any = await api.addPDCPayable({ ...payForm, amount: Number(payForm.amount) })
    if (res?.success) { toast.success('PDC Payable added'); setShowAdd(false); setPayForm({ supplierId: '', checkNumber: '', bank: '', amount: '', issueDate: '', dueDate: '', notes: '' }); triggerRefresh() }
    else toast.error('Failed')
  }

  const updateRecStatus = async (id: string, status: string) => {
    const res: any = await api.updatePDCReceivable(id, status)
    if (res?.success) { toast.success(`Status updated to ${status}`); triggerRefresh() }
  }

  const updatePayStatus = async (id: string, status: string) => {
    const res: any = await api.updatePDCPayable(id, status)
    if (res?.success) { toast.success(`Status updated to ${status}`); triggerRefresh() }
  }

  const statuses = tab === 'receivable' ? ['pending','deposited','cleared','returned'] : ['pending','presented','cleared','returned']

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-enter">
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-text-muted mb-1">PDC Receivable</p><p className="text-2xl font-bold text-success">{formatCurrency(totalRec, true)}</p></div>
        <div className="card p-4"><p className="text-xs text-text-muted mb-1">PDC Payable</p><p className="text-2xl font-bold text-danger">{formatCurrency(totalPay, true)}</p></div>
        <div className="card p-4"><p className="text-xs text-text-muted mb-1">Receivable Checks</p><p className="text-2xl font-bold">{pdcRec.filter((p:any) => p.status === 'pending').length}</p></div>
        <div className="card p-4"><p className="text-xs text-text-muted mb-1">Payable Checks</p><p className="text-2xl font-bold">{pdcPay.filter((p:any) => p.status === 'pending').length}</p></div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex gap-1">
            {[['receivable','PDC Receivable'],['payable','PDC Payable']].map(([t, l]) => (
              <button key={t} onClick={() => setTab(t as any)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors', tab === t ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary')}>{l}</button>
            ))}
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-xs !py-1.5"><Plus size={13} /> Add PDC</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-text-muted"><RefreshCw size={16} className="animate-spin" /><span>Loading...</span></div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-border bg-surface-1">
              <th className="text-left px-5 py-3 table-header">{tab === 'receivable' ? 'Customer' : 'Supplier'}</th>
              <th className="text-left px-5 py-3 table-header">Check #</th>
              <th className="text-left px-5 py-3 table-header">Bank</th>
              <th className="text-right px-5 py-3 table-header">Amount</th>
              <th className="text-left px-5 py-3 table-header">{tab === 'receivable' ? 'Deposit Date' : 'Due Date'}</th>
              <th className="text-left px-5 py-3 table-header">Status</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody>
              {(tab === 'receivable' ? pdcRec : pdcPay).map((p: any) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-surface-1/50">
                  <td className="px-5 py-3 text-sm font-medium">{tab === 'receivable' ? p.customerName : p.supplierName}</td>
                  <td className="px-5 py-3 text-sm text-accent font-mono">{p.checkNumber}</td>
                  <td className="px-5 py-3 text-sm text-text-secondary">{p.bank}</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold">{formatCurrency(p.amount)}</td>
                  <td className="px-5 py-3 text-sm text-text-secondary">{formatDate(tab === 'receivable' ? p.depositDate : p.dueDate)}</td>
                  <td className="px-5 py-3"><span className={getStatusColor(p.status)}>{getStatusLabel(p.status)}</span></td>
                  <td className="px-5 py-3">
                    {p.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => tab === 'receivable' ? updateRecStatus(p.id, 'deposited') : updatePayStatus(p.id, 'presented')} className="btn-ghost !px-2 !py-1 text-xs text-accent">{tab === 'receivable' ? 'Deposit' : 'Present'}</button>
                        <button onClick={() => tab === 'receivable' ? updateRecStatus(p.id, 'returned') : updatePayStatus(p.id, 'returned')} className="btn-ghost !px-2 !py-1 text-xs text-danger">Return</button>
                      </div>
                    )}
                    {(p.status === 'deposited' || p.status === 'presented') && (
                      <button onClick={() => tab === 'receivable' ? updateRecStatus(p.id, 'cleared') : updatePayStatus(p.id, 'cleared')} className="btn-ghost !px-2 !py-1 text-xs text-success">Clear</button>
                    )}
                  </td>
                </tr>
              ))}
              {(tab === 'receivable' ? pdcRec : pdcPay).length === 0 && (
                <tr><td colSpan={7} className="text-center py-16 text-sm text-text-muted">No PDC checks yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={`Add PDC ${tab === 'receivable' ? 'Receivable' : 'Payable'}`}>
        {tab === 'receivable' ? (
          <div className="space-y-3">
            <div><label className="label">Customer *</label>
              <select className="input" value={recForm.customerId} onChange={e => setRecForm(p => ({...p, customerId: e.target.value}))}>
                <option value="">Select Customer</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Check Number</label><input className="input" value={recForm.checkNumber} onChange={e => setRecForm(p => ({...p, checkNumber: e.target.value}))} /></div>
              <div><label className="label">Bank</label><input className="input" value={recForm.bank} onChange={e => setRecForm(p => ({...p, bank: e.target.value}))} /></div>
            </div>
            <div><label className="label">Amount *</label><input type="number" className="input" value={recForm.amount} onChange={e => setRecForm(p => ({...p, amount: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Issue Date</label><input type="date" className="input" value={recForm.issueDate} onChange={e => setRecForm(p => ({...p, issueDate: e.target.value}))} /></div>
              <div><label className="label">Deposit Date *</label><input type="date" className="input" value={recForm.depositDate} onChange={e => setRecForm(p => ({...p, depositDate: e.target.value}))} /></div>
            </div>
            <div><label className="label">Notes</label><textarea className="input" rows={2} value={recForm.notes} onChange={e => setRecForm(p => ({...p, notes: e.target.value}))} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAddRec}>Add PDC Receivable</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div><label className="label">Supplier *</label>
              <select className="input" value={payForm.supplierId} onChange={e => setPayForm(p => ({...p, supplierId: e.target.value}))}>
                <option value="">Select Supplier</option>
                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Check Number</label><input className="input" value={payForm.checkNumber} onChange={e => setPayForm(p => ({...p, checkNumber: e.target.value}))} /></div>
              <div><label className="label">Bank</label><input className="input" value={payForm.bank} onChange={e => setPayForm(p => ({...p, bank: e.target.value}))} /></div>
            </div>
            <div><label className="label">Amount *</label><input type="number" className="input" value={payForm.amount} onChange={e => setPayForm(p => ({...p, amount: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Issue Date</label><input type="date" className="input" value={payForm.issueDate} onChange={e => setPayForm(p => ({...p, issueDate: e.target.value}))} /></div>
              <div><label className="label">Due Date *</label><input type="date" className="input" value={payForm.dueDate} onChange={e => setPayForm(p => ({...p, dueDate: e.target.value}))} /></div>
            </div>
            <div><label className="label">Notes</label><textarea className="input" rows={2} value={payForm.notes} onChange={e => setPayForm(p => ({...p, notes: e.target.value}))} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAddPay}>Add PDC Payable</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
