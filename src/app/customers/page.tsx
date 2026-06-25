'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Search, Trash2, Download, Printer, FileText, Users, RefreshCw, ArrowLeft, Eye, PlusCircle, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { downloadExcel } from '@/lib/export'
import { useShell } from '@/components/AppShell'
import { Modal, Loading, Empty } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { printHtml, printTableReport, fmt, COMPANY_NAME } from '@/lib/print'
import { FileDown } from 'lucide-react'

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
  const [editCustId, setEditCustId] = useState<string | null>(null)
  const [txnForm, setTxnForm] = useState({ ...blankTxn })
  const [ledger, setLedger] = useState<any>(null) // selected customer detail
  const [stmtFrom, setStmtFrom] = useState('')
  const [stmtTo, setStmtTo] = useState('')

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
      const payload = { ...custForm, openingBalance: Number(custForm.openingBalance) || 0 }
      const res = editCustId ? await api.updateCustomer(editCustId, payload) : await api.addCustomer(payload)
      if (res?.success) {
        toast.success(editCustId ? 'Customer updated' : 'Customer added')
        setShowCust(false); setCustForm({ ...blankCust }); setEditCustId(null); load()
      }
    } catch (e: any) { toast.error(e.message || 'Failed') }
  }

  const openAddCust = () => { setEditCustId(null); setCustForm({ ...blankCust }); setShowCust(true) }
  const openEditCust = (c: any) => {
    setEditCustId(c.id)
    setCustForm({ name: c.name, phone: c.phone || '', address: c.address || '', openingBalance: String(c.openingBalance ?? ''), balanceType: c.balanceType || 'debit' })
    setShowCust(true)
  }
  const openAddTxnFor = (id: string) => { setTxnForm({ ...blankTxn, customerId: id }); setShowTxn(true) }

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

  const removeTxn = async (txnId: string, customerId: string) => {
    if (!confirm('Delete this transaction?')) return
    try { await api.deleteTransaction(txnId); toast.success('Transaction deleted'); load(); openLedger(customerId) }
    catch (e: any) { toast.error(e.message || 'Failed') }
  }

  // Row-level "Download Statement": fetch the customer's full ledger and export
  // the same Excel statement as the detail view (all transactions, not visible only).
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const downloadStatementRow = async (id: string) => {
    setDownloadingId(id)
    try {
      const cust = await api.getCustomer(id)
      await exportStatementExcel(cust)
      toast.success('Statement exported')
    } catch { toast.error('Export failed') }
    finally { setDownloadingId(null) }
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
          { header: 'Debit', key: 'debit', width: 16 },
          { header: 'Credit', key: 'credit', width: 16 },
        ],
        (all || []).map((c: any) => ({
          name: c.name, phone: c.phone || '', address: c.address || '',
          debit: c.currentBalance > 0 ? c.currentBalance : 0,
          credit: c.currentBalance < 0 ? -c.currentBalance : 0,
        })),
      )
      toast.success('Exported')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  // Clean "All Parties Balance" report — generated as a standalone document
  // (no website chrome / sidebar / buttons), using all DB records.
  const handlePrint = async () => {
    const all = await api.getCustomers().catch(() => customers)
    const list = (all || []).slice().sort((a: any, b: any) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance))
    const tDebit = list.filter((c: any) => c.currentBalance > 0).reduce((s: number, c: any) => s + c.currentBalance, 0)
    const tCredit = list.filter((c: any) => c.currentBalance < 0).reduce((s: number, c: any) => s + -c.currentBalance, 0)
    const tNet = tDebit - tCredit
    printTableReport(
      'All Parties Balance',
      [
        { header: 'Party Name', key: 'name' },
        { header: 'Phone', key: 'phone' },
        { header: 'Debit', key: 'debit', align: 'right' },
        { header: 'Credit', key: 'credit', align: 'right' },
      ],
      list.map((c: any) => ({
        name: c.name, phone: c.phone || '-',
        debit: c.currentBalance > 0 ? fmt(c.currentBalance) : '-',
        credit: c.currentBalance < 0 ? fmt(-c.currentBalance) : '-',
      })),
      {
        subtitle: `${list.length} Parties · ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
        total: { label: `Net Balance (${tNet >= 0 ? 'Receivable' : 'Payable'})`, value: fmt(Math.abs(tNet)) },
        summary: [
          { k: 'Total Debit', v: fmt(tDebit), cls: 'red' },
          { k: 'Total Credit', v: fmt(tCredit), cls: 'green' },
          { k: 'Net Balance', v: fmt(Math.abs(tNet)), cls: tNet >= 0 ? 'red' : 'green' },
        ],
      },
    )
  }

  // ---- Customer statement / ledger detail view ----
  if (ledger) {
    const opening = ledger.balanceType === 'credit' ? -ledger.openingBalance : ledger.openingBalance

    // Most recent transaction (by date) for the CRM "Last Transaction" field.
    const lastTxn = (ledger.transactions || []).slice().sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0]

    // Apply date-range filter to transactions (inclusive). Opening balance always shows first.
    const fromD = stmtFrom ? new Date(stmtFrom) : null
    const toD = stmtTo ? new Date(stmtTo + 'T23:59:59') : null
    const inRange = (d: any) => { const x = new Date(d); return (!fromD || x >= fromD) && (!toD || x <= toD) }
    const txns = (ledger.transactions || []).filter((t: any) => inRange(t.date))

    // Build rows with running balance. Debit increases receivable (+), credit increases payable (-).
    let running = opening
    const rows = txns.map((t: any) => {
      running += t.type === 'credit' ? -t.amount : t.amount
      return { ...t, balance: running }
    })
    const txnDebit = txns.filter((t: any) => t.type === 'debit').reduce((s: number, t: any) => s + t.amount, 0)
    const txnCredit = txns.filter((t: any) => t.type === 'credit').reduce((s: number, t: any) => s + t.amount, 0)
    const totalDebit = txnDebit + (opening > 0 ? opening : 0)
    const totalCredit = txnCredit + (opening < 0 ? -opening : 0)
    const netBalance = running
    const statusLabel = netBalance > 0 ? 'Debit — Receivable' : netBalance < 0 ? 'Credit — Payable' : 'Settled'

    const rangeText = (fromD || toD)
      ? `${stmtFrom ? formatDate(stmtFrom) : 'Start'} — ${stmtTo ? formatDate(stmtTo) : 'Today'}`
      : 'All Transactions'

    const statementExcel = async () => {
      await downloadExcel(
        `Statement_${ledger.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`,
        'Statement',
        [
          { header: 'Date', key: 'date', width: 14 },
          { header: 'Tafseel / Description', key: 'desc', width: 34 },
          { header: 'Debit (-)', key: 'debit', width: 16 },
          { header: 'Credit (+)', key: 'credit', width: 16 },
          { header: 'Balance', key: 'balance', width: 18 },
        ],
        [
          { date: formatDate(ledger.createdAt), desc: 'Opening Balance', debit: opening > 0 ? opening : 0, credit: opening < 0 ? -opening : 0, balance: Math.abs(opening) },
          ...rows.map((r: any) => ({
            date: formatDate(r.date), desc: r.description || '-',
            debit: r.type === 'debit' ? r.amount : 0, credit: r.type === 'credit' ? r.amount : 0,
            balance: Math.abs(r.balance),
          })),
          { date: '', desc: 'TOTAL', debit: totalDebit, credit: totalCredit, balance: Math.abs(netBalance) },
        ],
      )
      toast.success('Exported')
    }

    const statementPdf = () => {
      const rowHtml = [
        `<tr class="opening"><td>${formatDate(ledger.createdAt)}</td><td>Opening Balance</td><td class="r">${opening > 0 ? fmt(opening) : '-'}</td><td class="r">${opening < 0 ? fmt(-opening) : '-'}</td><td class="r">${fmt(Math.abs(opening))}</td></tr>`,
        ...rows.map((r: any) => `<tr><td>${formatDate(r.date)}</td><td>${(r.description || '-')}</td><td class="r red">${r.type === 'debit' ? fmt(r.amount) : '-'}</td><td class="r green">${r.type === 'credit' ? fmt(r.amount) : '-'}</td><td class="r">${fmt(Math.abs(r.balance))}</td></tr>`),
      ].join('')
      printHtml(`Statement - ${ledger.name}`, `
        <div class="rpt-header">
          <div><div class="rpt-company">${COMPANY_NAME}</div></div>
          <div><div class="rpt-title">Account Statement</div><div class="rpt-meta">${rangeText}</div></div>
        </div>
        <div class="rpt-info">
          <div><span class="lbl">Customer:</span> <b>${ledger.name}</b></div>
          <div><span class="lbl">Phone:</span> <b>${ledger.phone || '—'}</b></div>
          <div><span class="lbl">Address:</span> <b>${ledger.address || '—'}</b></div>
        </div>
        <div class="summary">
          <div class="box"><div class="k">Total Debit</div><div class="v red">${fmt(totalDebit)}</div></div>
          <div class="box"><div class="k">Total Credit</div><div class="v green">${fmt(totalCredit)}</div></div>
          <div class="box"><div class="k">Net Balance</div><div class="v ${netBalance >= 0 ? 'red' : 'green'}">${fmt(Math.abs(netBalance))}</div></div>
          <div class="box"><div class="k">Status</div><div class="v blue" style="font-size:13px">${statusLabel}</div></div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Tafseel / Description</th><th class="r">Debit (-)</th><th class="r">Credit (+)</th><th class="r">Balance</th></tr></thead>
          <tbody>${rowHtml}</tbody>
          <tfoot><tr><td colspan="2">TOTAL</td><td class="r red">${fmt(totalDebit)}</td><td class="r green">${fmt(totalCredit)}</td><td class="r">${fmt(Math.abs(netBalance))}</td></tr></tfoot>
        </table>`)
    }

    return (
      <div className="p-4 md:p-6 space-y-5 animate-enter">
        <button onClick={() => { setLedger(null); setStmtFrom(''); setStmtTo('') }} className="btn-ghost !px-2"><ArrowLeft size={16} /> Back to All Parties</button>

        {/* CRM-style customer header */}
        <div className="card p-4 md:p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-start gap-3 md:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-accent-light text-accent flex items-center justify-center text-lg font-bold">
                {ledger.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-text-primary truncate">{ledger.name}</h2>
                <p className="text-sm text-text-muted truncate">{ledger.phone || '—'} · {ledger.address || '—'}</p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Current Balance</p>
              <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(Math.abs(netBalance))}</p>
              <span className={`badge ${netBalance > 0 ? 'badge-danger' : netBalance < 0 ? 'badge-success' : 'badge-neutral'}`}>{statusLabel}</span>
            </div>
          </div>

          {/* Quick CRM facts */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm border-t border-border pt-3">
            <div><p className="text-[11px] text-text-muted uppercase tracking-wide">Opening Balance</p><p className="font-semibold">{formatCurrency(Math.abs(opening))} <span className="text-xs font-normal text-text-muted">{opening >= 0 ? 'Dr' : 'Cr'}</span></p></div>
            <div><p className="text-[11px] text-text-muted uppercase tracking-wide">Last Transaction</p><p className="font-semibold">{lastTxn ? `${formatDate(lastTxn.date)}` : '—'}</p>{lastTxn && <p className="text-xs text-text-muted">{lastTxn.type === 'debit' ? 'Debit' : 'Credit'} {formatCurrency(lastTxn.amount)}</p>}</div>
            <div><p className="text-[11px] text-text-muted uppercase tracking-wide">Total Entries</p><p className="font-semibold">{(ledger.transactions || []).length}</p></div>
          </div>

          {/* Actions + date range */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between border-t border-border pt-3">
            <div className="flex flex-wrap items-end gap-2">
              <div><label className="label">From</label><input type="date" className="input !py-1.5 text-xs" value={stmtFrom} onChange={(e) => setStmtFrom(e.target.value)} /></div>
              <div><label className="label">To</label><input type="date" className="input !py-1.5 text-xs" value={stmtTo} onChange={(e) => setStmtTo(e.target.value)} /></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => openAddTxnFor(ledger.id)} className="btn-secondary text-xs !py-2"><PlusCircle size={14} /> Add Txn</button>
              <button onClick={() => openEditCust(ledger)} className="btn-secondary text-xs !py-2"><Pencil size={14} /> Edit</button>
              <button onClick={statementExcel} className="btn-secondary text-xs !py-2"><Download size={14} /> Excel</button>
              <button onClick={statementPdf} className="btn-secondary text-xs !py-2"><FileDown size={14} /> PDF</button>
              <button onClick={statementPdf} className="btn-secondary text-xs !py-2"><Printer size={14} /> Print</button>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-stat p-4 sm:p-5"><p className="text-[11px] font-semibold text-danger mb-1">TOTAL DEBIT</p><p className="text-2xl font-bold text-danger">{formatCurrency(totalDebit)}</p></div>
          <div className="card-stat p-4 sm:p-5"><p className="text-[11px] font-semibold text-success mb-1">TOTAL CREDIT</p><p className="text-2xl font-bold text-success">{formatCurrency(totalCredit)}</p></div>
          <div className="card-stat p-4 sm:p-5"><p className="text-[11px] font-semibold text-text-muted mb-1">NET BALANCE</p><p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(Math.abs(netBalance))}</p></div>
          <div className="card-stat p-4 sm:p-5"><p className="text-[11px] font-semibold text-text-muted mb-1">STATUS</p><span className={`badge ${netBalance > 0 ? 'badge-danger' : netBalance < 0 ? 'badge-success' : 'badge-neutral'} mt-1`}>{statusLabel}</span></div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <p className="section-title">Statement · <span className="text-text-muted font-normal text-sm">{rangeText}</span></p>
            <button onClick={() => { setTxnForm({ ...blankTxn, customerId: ledger.id }); setShowTxn(true) }} className="btn-primary text-xs !py-1.5"><Plus size={13} /> Add Transaction</button>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-border bg-surface-1">
              <th className="text-left px-5 py-3 table-header">Date</th>
              <th className="text-left px-5 py-3 table-header">Tafseel / Description</th>
              <th className="text-right px-5 py-3 table-header">Debit (-)</th>
              <th className="text-right px-5 py-3 table-header">Credit (+)</th>
              <th className="text-right px-5 py-3 table-header">Balance</th>
              <th className="px-5 py-3 no-print" />
            </tr></thead>
            <tbody>
              <tr className="border-b border-border/50 bg-surface-1/60">
                <td className="px-5 py-3 text-sm text-text-secondary">{formatDate(ledger.createdAt)}</td>
                <td className="px-5 py-3 text-sm text-text-muted italic">Opening Balance</td>
                <td className="px-5 py-3 text-right text-sm">{opening > 0 ? formatCurrency(opening) : '-'}</td>
                <td className="px-5 py-3 text-right text-sm">{opening < 0 ? formatCurrency(-opening) : '-'}</td>
                <td className="px-5 py-3 text-right text-sm font-medium">{formatCurrency(Math.abs(opening))}</td>
                <td className="px-5 py-3 no-print" />
              </tr>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-surface-1/50">
                  <td className="px-5 py-3 text-sm text-text-secondary">{formatDate(r.date)}</td>
                  <td className="px-5 py-3 text-sm text-text-primary">{r.description || '-'}</td>
                  <td className="px-5 py-3 text-right text-sm text-danger">{r.type === 'debit' ? formatCurrency(r.amount) : '-'}</td>
                  <td className="px-5 py-3 text-right text-sm text-success">{r.type === 'credit' ? formatCurrency(r.amount) : '-'}</td>
                  <td className="px-5 py-3 text-right text-sm font-medium">{formatCurrency(Math.abs(r.balance))}</td>
                  <td className="px-5 py-3 no-print">
                    <button onClick={() => removeTxn(r.id, ledger.id)} aria-label="Delete transaction" title="Delete transaction" className="btn-ghost !px-2 !py-1.5 text-danger"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-1 font-bold">
                <td className="px-5 py-3 text-sm" colSpan={2}>TOTAL</td>
                <td className="px-5 py-3 text-right text-sm text-danger">{formatCurrency(totalDebit)}</td>
                <td className="px-5 py-3 text-right text-sm text-success">{formatCurrency(totalCredit)}</td>
                <td className="px-5 py-3 text-right text-sm">{formatCurrency(Math.abs(netBalance))}</td>
                <td className="px-5 py-3 no-print" />
              </tr>
            </tfoot>
          </table>
          {rows.length === 0 && <Empty aria-label="No transactions in this date range" title="No transactions in this date range" />}
        </div>

        <Modal open={showTxn} onClose={() => setShowTxn(false)} aria-label="Add Transaction" title="Add Transaction">
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-enter">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-text-primary">All Parties Balance</h2>
          <p className="text-sm text-text-muted">Summary of all customers — click a party to view detailed statement</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExport} disabled={exporting} className="btn-secondary !px-3 sm:!px-4">
            {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />} Excel
          </button>
          <button onClick={handlePrint} className="btn-secondary !px-3 sm:!px-4"><Printer size={16} /> <span className="hidden xs:inline">Print Report</span><span className="xs:hidden">Print</span></button>
          <button onClick={() => { setTxnForm({ ...blankTxn }); setShowTxn(true) }} className="btn-secondary !px-3 sm:!px-4"><FileText size={16} /> <span className="hidden sm:inline">Add Transaction</span><span className="sm:hidden">Txn</span></button>
          <button onClick={openAddCust} className="btn-primary !px-3 sm:!px-4"><Plus size={16} /> <span className="hidden sm:inline">Add Customer</span><span className="sm:hidden">Customer</span></button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-stat p-4 sm:p-5"><p className="text-xs text-text-muted mb-1">Total Parties</p><p className="text-2xl font-bold">{customers.length}</p></div>
        <div className="card-stat p-4 sm:p-5"><p className="text-[11px] font-semibold text-danger mb-1">TOTAL DEBIT</p><p className="text-2xl font-bold text-danger">{formatCurrency(totalDebit)}</p><p className="text-xs text-text-muted">All receivables</p></div>
        <div className="card-stat p-4 sm:p-5"><p className="text-[11px] font-semibold text-success mb-1">TOTAL CREDIT</p><p className="text-2xl font-bold text-success">{formatCurrency(totalCredit)}</p><p className="text-xs text-text-muted">All payables</p></div>
        <div className="card-stat p-4 sm:p-5"><p className="text-[11px] font-semibold text-text-muted mb-1">NET BALANCE</p><p className="text-2xl font-bold">{formatCurrency(Math.abs(net))}</p><span className="badge badge-neutral mt-1">{net === 0 ? '— Settled' : net > 0 ? 'Receivable' : 'Payable'}</span></div>
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
            <button onClick={openAddCust} className="btn-primary"><Plus size={16} /> Add Customer</button>
          </div>
        ) : (
          <table className="rtable w-full">
            <thead><tr className="border-b border-border bg-surface-1">
              <th className="text-left px-5 py-3 table-header">Party Name</th>
              <th className="text-left px-5 py-3 table-header">Phone</th>
              <th className="text-right px-5 py-3 table-header">Debit</th>
              <th className="text-right px-5 py-3 table-header">Credit</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-surface-1/50">
                  <td data-label="Party Name" className="px-5 py-3 text-sm font-medium text-text-primary cursor-pointer" onClick={() => openLedger(c.id)}>{c.name}</td>
                  <td data-label="Phone" className="px-5 py-3 text-sm text-text-secondary">{c.phone || '-'}</td>
                  <td data-label="Debit" className="px-5 py-3 text-right text-sm font-semibold text-danger">{c.currentBalance > 0 ? formatCurrency(c.currentBalance) : '-'}</td>
                  <td data-label="Credit" className="px-5 py-3 text-right text-sm font-semibold text-success">{c.currentBalance < 0 ? formatCurrency(-c.currentBalance) : '-'}</td>
                  <td className="px-5 py-3 cell-actions">
                    <div className="flex items-center gap-0.5 justify-end">
                      <button onClick={() => openLedger(c.id)} aria-label="View statement" title="View statement" className="btn-ghost !px-2 !py-1.5"><Eye size={15} /></button>
                      <button onClick={() => openAddTxnFor(c.id)} aria-label="Add transaction" title="Add transaction" className="btn-ghost !px-2 !py-1.5 text-accent"><PlusCircle size={15} /></button>
                      <button onClick={() => openEditCust(c)} aria-label="Edit customer" title="Edit customer" className="btn-ghost !px-2 !py-1.5"><Pencil size={15} /></button>
                      <button onClick={() => downloadStatementRow(c.id)} disabled={downloadingId === c.id} aria-label="Download statement (Excel)" title="Download statement (Excel)" className="btn-ghost !px-2 !py-1.5">{downloadingId === c.id ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}</button>
                      <button onClick={() => removeCust(c.id)} aria-label="Delete customer" title="Delete customer" className="btn-ghost !px-2 !py-1.5 text-danger"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showCust} onClose={() => { setShowCust(false); setEditCustId(null) }} title={editCustId ? 'Edit Customer' : 'Add Customer'}>
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
            <button className="btn-secondary" onClick={() => { setShowCust(false); setEditCustId(null) }}>Cancel</button>
            <button className="btn-primary" onClick={saveCust}>{editCustId ? 'Save Changes' : 'Add Customer'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={showTxn} onClose={() => setShowTxn(false)} aria-label="Add Transaction" title="Add Transaction">
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

// Shared: export a customer's full ledger statement to Excel (all transactions,
// opening balance first, running balance + totals). Used by the row-level
// "Download Statement" action. Mirrors the in-statement Excel export.
async function exportStatementExcel(cust: any) {
  const opening = cust.balanceType === 'credit' ? -cust.openingBalance : cust.openingBalance
  let running = opening
  const rows = (cust.transactions || []).map((t: any) => {
    running += t.type === 'credit' ? -t.amount : t.amount
    return { ...t, balance: running }
  })
  const totalDebit = (cust.transactions || []).filter((t: any) => t.type === 'debit').reduce((s: number, t: any) => s + t.amount, 0)
  const totalCredit = (cust.transactions || []).filter((t: any) => t.type === 'credit').reduce((s: number, t: any) => s + t.amount, 0)
  await downloadExcel(
    `Statement_${cust.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`,
    'Statement',
    [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Tafseel / Description', key: 'desc', width: 34 },
      { header: 'Debit (-)', key: 'debit', width: 16 },
      { header: 'Credit (+)', key: 'credit', width: 16 },
      { header: 'Balance', key: 'balance', width: 18 },
    ],
    [
      { date: formatDate(cust.createdAt), desc: 'Opening Balance', debit: opening > 0 ? opening : 0, credit: opening < 0 ? -opening : 0, balance: Math.abs(opening) },
      ...rows.map((r: any) => ({
        date: formatDate(r.date), desc: r.description || '-',
        debit: r.type === 'debit' ? r.amount : 0, credit: r.type === 'credit' ? r.amount : 0,
        balance: Math.abs(r.balance),
      })),
      { date: '', desc: 'TOTAL', debit: totalDebit, credit: totalCredit, balance: Math.abs(running) },
    ],
  )
}
