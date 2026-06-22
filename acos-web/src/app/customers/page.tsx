'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Search, Trash2, Download, Printer, FileText, Users, RefreshCw, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { downloadExcel } from '@/lib/export'
import { useShell } from '@/components/AppShell'
import { Modal, Loading, Empty } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'

const blankCust = { name: '', phone: '', address: '', openingBalance: '', balanceType: 'debit' }
const blankTxn = { customerId: '', type: 'debit', amount: '', description: '', date: new Date().toISOString().split('T')[0] }

export default function CustomersPage() {
  const { refreshKey } = useShell()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showCust, setShowCust] = useState(false)
  const [showTxn, setShowTxn] = useState(false)
  const [custForm, setCustForm] = useState({ ...blankCust })
  const [txnForm, setTxnForm] = useState({ ...blankTxn })
  const [ledger, setLedger] = useState<any>(null) // selected customer detail

  const load = useCallback(() => {
    setLoading(true)
    api.getCustomers(search || undefined).then((c) => setCustomers(c || []))
      .catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [search])

  useEffect(() => { load() }, [search, refreshKey, load])

  const filtered = customers.filter((c) => {
    if (filter === 'receivable') return c.currentBalance > 0
    if (filter === 'payable') return c.currentBalance < 0
    return true
  })

  const totalDebit = customers.filter((c) => c.currentBalance > 0).reduce((s, c) => s + c.currentBalance, 0)
  const totalCredit = customers.filter((c) => c.currentBalance < 0).reduce((s, c) => s + -c.currentBalance, 0)
  const net = totalDebit - totalCredit

  const saveCust = async () => {
    if (!custForm.name) return toast.error('Customer name required')
    try {
      const res = await api.addCustomer({ ...custForm, openingBalance: Number(custForm.openingBalance) || 0 })
      if (res?.success) { toast.success('Customer added'); setShowCust(false); setCustForm({ ...blankCust }); load() }
    } catch (e: any) { toast.error(e.message || 'Failed') }
  }

  const saveTxn = async () => {
    if (!txnForm.customerId) return toast.error('Select a party')
    if (!txnForm.amount) return toast.error('Amount required')
    try {
      const res = await api.addTransaction({ ...txnForm, amount: Number(txnForm.amount) })
      if (res?.success) { toast.success('Transaction added'); setShowTxn(false); setTxnForm({ ...blankTxn }); load(); if (ledger) openLedger(txnForm.customerId) }
    } catch (e: any) { toast.error(e.message || 'Failed') }
  }

  const removeCust = async (id: string) => {
    if (!confirm('Delete this party? Its transactions will be removed.')) return
    try { await api.deleteCustomer(id); toast.success('Deleted'); load() }
    catch (e: any) { toast.error(e.message || 'Cannot delete') }
  }

  const openLedger = async (id: string) => {
    try { setLedger(await api.getCustomer(id)) } catch { toast.error('Failed to load ledger') }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const all = await api.getCustomers()
      await downloadExcel(
        `Customers_${new Date().toISOString().split('T')[0]}.xlsx`,
        'Parties',
        [
          { header: 'Party Name', key: 'name', width: 26 },
          { header: 'Phone', key: 'phone', width: 16 },
          { header: 'Address', key: 'address', width: 30 },
          { header: 'Balance', key: 'balance', width: 16 },
          { header: 'Type', key: 'type', width: 16 },
        ],
        (all || []).map((c: any) => ({
          name: c.name, phone: c.phone || '', address: c.address || '',
          balance: Math.abs(c.currentBalance),
          type: c.currentBalance >= 0 ? 'Debit / Receivable' : 'Credit / Payable',
        })),
      )
      toast.success('Exported')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const handlePrint = () => window.print()

  // ---- Ledger detail view ----
  if (ledger) {
    const opening = ledger.balanceType === 'credit' ? -ledger.openingBalance : ledger.openingBalance
    let running = opening
    return (
      <div className="p-6 space-y-5 animate-enter">
        <button onClick={() => setLedger(null)} className="btn-ghost !px-2 mb-1"><ArrowLeft size={16} /> Back to All Parties</button>
        <div className="card p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary">{ledger.name}</h2>
            <p className="text-sm text-text-muted">{ledger.phone || '—'} · {ledger.address || '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Current Balance</p>
            <p className={`text-2xl font-bold ${running >= 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(Math.abs(running))}</p>
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <p className="section-title">Ledger Statement</p>
            <button onClick={() => { setTxnForm({ ...blankTxn, customerId: ledger.id }); setShowTxn(true) }} className="btn-primary text-xs !py-1.5"><Plus size={13} /> Add Transaction</button>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-border bg-surface-1">
              <th className="text-left px-5 py-3 table-header">Date</th>
              <th className="text-left px-5 py-3 table-header">Description</th>
              <th className="text-right px-5 py-3 table-header">Debit</th>
              <th className="text-right px-5 py-3 table-header">Credit</th>
              <th className="text-right px-5 py-3 table-header">Balance</th>
            </tr></thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="px-5 py-3 text-sm text-text-secondary">{formatDate(ledger.createdAt)}</td>
                <td className="px-5 py-3 text-sm text-text-muted italic">Opening Balance</td>
                <td className="px-5 py-3 text-right text-sm">{opening > 0 ? formatCurrency(opening) : '-'}</td>
                <td className="px-5 py-3 text-right text-sm">{opening < 0 ? formatCurrency(-opening) : '-'}</td>
                <td className="px-5 py-3 text-right text-sm font-medium">{formatCurrency(Math.abs(opening))}</td>
              </tr>
              {ledger.transactions.map((t: any) => {
                running += t.type === 'credit' ? -t.amount : t.amount
                return (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-surface-1/50">
                    <td className="px-5 py-3 text-sm text-text-secondary">{formatDate(t.date)}</td>
                    <td className="px-5 py-3 text-sm text-text-primary">{t.description || '-'}</td>
                    <td className="px-5 py-3 text-right text-sm text-danger">{t.type === 'debit' ? formatCurrency(t.amount) : '-'}</td>
                    <td className="px-5 py-3 text-right text-sm text-success">{t.type === 'credit' ? formatCurrency(t.amount) : '-'}</td>
                    <td className="px-5 py-3 text-right text-sm font-medium">{formatCurrency(Math.abs(running))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {ledger.transactions.length === 0 && <Empty title="No transactions yet" />}
        </div>
        <Modal open={showTxn} onClose={() => setShowTxn(false)} title="Add Transaction">
          <TxnFields form={txnForm} setForm={setTxnForm} customers={customers} lockParty />
          <div className="flex justify-end gap-2 pt-3">
            <button className="btn-secondary" onClick={() => setShowTxn(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveTxn}>Add</button>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 animate-enter">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-text-primary">All Parties Balance</h2>
          <p className="text-sm text-text-muted">Summary of all customers — click a party to view detailed statement</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting} className="btn-secondary">
            {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />} Excel
          </button>
          <button onClick={handlePrint} className="btn-secondary"><Printer size={16} /> Print Report</button>
          <button onClick={() => { setTxnForm({ ...blankTxn }); setShowTxn(true) }} className="btn-secondary"><FileText size={16} /> Add Transaction</button>
          <button onClick={() => { setCustForm({ ...blankCust }); setShowCust(true) }} className="btn-primary"><Plus size={16} /> Add Customer</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Total Parties</p><p className="text-2xl font-bold">{customers.length}</p></div>
        <div className="card p-5"><p className="text-[11px] font-semibold text-danger mb-1">TOTAL DEBIT</p><p className="text-2xl font-bold text-danger">{formatCurrency(totalDebit)}</p><p className="text-xs text-text-muted">All receivables</p></div>
        <div className="card p-5"><p className="text-[11px] font-semibold text-success mb-1">TOTAL CREDIT</p><p className="text-2xl font-bold text-success">{formatCurrency(totalCredit)}</p><p className="text-xs text-text-muted">All payables</p></div>
        <div className="card p-5"><p className="text-[11px] font-semibold text-text-muted mb-1">NET BALANCE</p><p className="text-2xl font-bold">{formatCurrency(Math.abs(net))}</p><span className="badge badge-neutral mt-1">{net === 0 ? '— Settled' : net > 0 ? 'Receivable' : 'Payable'}</span></div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <p className="section-title">All Parties <span className="text-text-muted font-normal">({filtered.length})</span></p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input placeholder="Search party..." className="input pl-8 !py-1.5 text-xs w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input !py-1.5 text-xs w-28" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option><option value="receivable">Receivable</option><option value="payable">Payable</option>
            </select>
          </div>
        </div>

        {loading ? <Loading /> : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Users size={40} className="text-text-muted opacity-40" />
            <p className="text-sm text-text-muted">No parties yet.</p>
            <button onClick={() => { setCustForm({ ...blankCust }); setShowCust(true) }} className="btn-primary"><Plus size={16} /> Add Customer</button>
          </div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-border bg-surface-1">
              <th className="text-left px-5 py-3 table-header">Party Name</th>
              <th className="text-left px-5 py-3 table-header">Phone</th>
              <th className="text-right px-5 py-3 table-header">Balance</th>
              <th className="text-left px-5 py-3 table-header">Type</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-surface-1/50 cursor-pointer" onClick={() => openLedger(c.id)}>
                  <td className="px-5 py-3 text-sm font-medium text-text-primary">{c.name}</td>
                  <td className="px-5 py-3 text-sm text-text-secondary">{c.phone || '-'}</td>
                  <td className={`px-5 py-3 text-right text-sm font-semibold ${c.currentBalance >= 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(Math.abs(c.currentBalance))}</td>
                  <td className="px-5 py-3"><span className={`badge ${c.currentBalance >= 0 ? 'badge-danger' : 'badge-success'}`}>{c.currentBalance >= 0 ? 'Debit' : 'Credit'}</span></td>
                  <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => removeCust(c.id)} className="btn-ghost !px-2 !py-1.5 text-danger"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showCust} onClose={() => setShowCust(false)} title="Add Customer">
        <div className="space-y-3">
          <div><label className="label">Customer / Party Name *</label><input className="input" value={custForm.name} onChange={(e) => setCustForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Opening Balance</label><input type="number" className="input" value={custForm.openingBalance} onChange={(e) => setCustForm((p) => ({ ...p, openingBalance: e.target.value }))} /></div>
            <div><label className="label">Balance Type</label>
              <select className="input" value={custForm.balanceType} onChange={(e) => setCustForm((p) => ({ ...p, balanceType: e.target.value }))}>
                <option value="debit">Debit — Receivable</option>
                <option value="credit">Credit — Payable</option>
              </select>
            </div>
          </div>
          <div><label className="label">Phone</label><input className="input" value={custForm.phone} onChange={(e) => setCustForm((p) => ({ ...p, phone: e.target.value }))} /></div>
          <div><label className="label">Address</label><textarea className="input" rows={2} value={custForm.address} onChange={(e) => setCustForm((p) => ({ ...p, address: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setShowCust(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveCust}>Add Customer</button>
          </div>
        </div>
      </Modal>

      <Modal open={showTxn} onClose={() => setShowTxn(false)} title="Add Transaction">
        <TxnFields form={txnForm} setForm={setTxnForm} customers={customers} />
        <div className="flex justify-end gap-2 pt-3">
          <button className="btn-secondary" onClick={() => setShowTxn(false)}>Cancel</button>
          <button className="btn-primary" onClick={saveTxn}>Add</button>
        </div>
      </Modal>
    </div>
  )
}

function TxnFields({ form, setForm, customers, lockParty }: any) {
  return (
    <div className="space-y-3">
      <div><label className="label">Party *</label>
        <select className="input" value={form.customerId} disabled={lockParty} onChange={(e) => setForm((p: any) => ({ ...p, customerId: e.target.value }))}>
          <option value="">Select party…</option>
          {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Type</label>
          <select className="input" value={form.type} onChange={(e) => setForm((p: any) => ({ ...p, type: e.target.value }))}>
            <option value="debit">Debit — Receivable</option>
            <option value="credit">Credit — Payable</option>
          </select>
        </div>
        <div><label className="label">Amount *</label><input type="number" className="input" value={form.amount} onChange={(e) => setForm((p: any) => ({ ...p, amount: e.target.value }))} /></div>
      </div>
      <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={(e) => setForm((p: any) => ({ ...p, date: e.target.value }))} /></div>
      <div><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))} /></div>
    </div>
  )
}
