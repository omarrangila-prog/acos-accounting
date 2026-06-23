'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Search, Trash2, Edit, Download, RefreshCw, FileDown, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '@/lib/api'
import { downloadExcel } from '@/lib/export'
import { printTableReport, fmt } from '@/lib/print'
import { useShell } from '@/components/AppShell'
import { Modal, Loading, Empty, DetailModal } from '@/components/ui'
import {
  formatCurrency, formatDate, expenseCategoryLabel, EXPENSE_CATEGORIES, CAT_COLORS,
  PAYMENT_METHODS, paymentMethodLabel, toDateInput,
} from '@/lib/utils'

const blank = { category: 'general', description: '', amount: '', paymentMethod: 'cash', date: new Date().toISOString().split('T')[0], isRecurring: false, recurringPeriod: 'monthly', notes: '' }

export default function ExpensesPage() {
  const { refreshKey } = useShell()
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [viewItem, setViewItem] = useState<any>(null)
  const [form, setForm] = useState({ ...blank })
  const searchRef = useRef(search), catRef = useRef(filterCat)
  searchRef.current = search; catRef.current = filterCat

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    api.getExpenses({ search: searchRef.current || undefined, category: catRef.current || undefined })
      .then((e) => setExpenses(e || []))
      .catch(() => toast.error('Failed to load expenses'))
      .finally(() => setLoading(false))
  }, [])

  // Reload on filter change + manual top-bar refresh
  useEffect(() => { load() }, [search, filterCat, refreshKey, load])

  // Auto-refresh once every 5 minutes (silent, no flicker)
  useEffect(() => {
    const t = setInterval(() => load(true), 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [load])

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const recurring = expenses.filter((e) => e.isRecurring).reduce((s, e) => s + e.amount, 0)

  const chartData = EXPENSE_CATEGORIES.map((cat) => ({
    label: expenseCategoryLabel(cat),
    value: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
    color: CAT_COLORS[cat],
  })).filter((d) => d.value > 0)

  const save = async () => {
    if (!form.description || !form.amount) return toast.error('Description and amount required')
    try {
      const payload = { ...form, amount: Number(form.amount) }
      const res = editItem ? await api.updateExpense(editItem.id, payload) : await api.addExpense(payload)
      if (res?.success) {
        toast.success(editItem ? 'Updated' : 'Expense added')
        setShowAdd(false); setEditItem(null); setForm({ ...blank })
        load() // refetch immediately so it shows right away
      }
    } catch (e: any) { toast.error(e.message || 'Failed') }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    try { await api.deleteExpense(id); toast.success('Deleted'); load() }
    catch (e: any) { toast.error(e.message || 'Failed') }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      // Always export ALL records (ignore current search/category filters)
      const all = await api.getExpenses()
      await downloadExcel(
        `Expenses_${new Date().toISOString().split('T')[0]}.xlsx`,
        'Expenses',
        [
          { header: 'Date', key: 'date', width: 14 },
          { header: 'Category', key: 'category', width: 18 },
          { header: 'Description', key: 'description', width: 30 },
          { header: 'Amount', key: 'amount', width: 16 },
          { header: 'Payment Method', key: 'paymentMethod', width: 18 },
          { header: 'Created Date', key: 'createdAt', width: 16 },
        ],
        (all || []).map((e: any) => ({
          date: formatDate(e.date),
          category: expenseCategoryLabel(e.category),
          description: e.description,
          amount: e.amount,
          paymentMethod: paymentMethodLabel(e.paymentMethod),
          createdAt: formatDate(e.createdAt),
        })),
      )
      toast.success('Exported')
    } catch (e: any) { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const handlePdf = async () => {
    setExporting(true)
    try {
      const all = await api.getExpenses() // all records, not just visible
      printTableReport(
        'Expenses Report',
        [
          { header: 'Date', key: 'date' },
          { header: 'Category', key: 'category' },
          { header: 'Description', key: 'description' },
          { header: 'Payment', key: 'payment' },
          { header: 'Amount', key: 'amount', align: 'right' },
        ],
        (all || []).map((e: any) => ({
          date: formatDate(e.date), category: expenseCategoryLabel(e.category),
          description: e.description, payment: paymentMethodLabel(e.paymentMethod), amount: fmt(e.amount),
        })),
        { total: { label: 'Total', value: fmt((all || []).reduce((s: number, e: any) => s + e.amount, 0)) } },
      )
    } catch { toast.error('PDF failed') }
    finally { setExporting(false) }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-enter">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Total Expenses</p><p className="text-2xl font-bold text-danger">{formatCurrency(total)}</p></div>
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Recurring</p><p className="text-2xl font-bold text-warning">{formatCurrency(recurring)}</p></div>
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Total Records</p><p className="text-2xl font-bold">{expenses.length}</p></div>
      </div>

      {chartData.length > 0 && (
        <div className="card p-5">
          <p className="section-title mb-4">By Category</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={75} innerRadius={45}>
                {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3 border-b border-border gap-2">
          <p className="section-title">Expenses</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[140px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input placeholder="Search..." className="input pl-8 !py-1.5 text-xs w-full sm:w-40" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input !py-1.5 text-xs flex-1 min-w-[130px] sm:w-36 sm:flex-none" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{expenseCategoryLabel(c)}</option>)}
            </select>
            <button onClick={handleExport} disabled={exporting} className="btn-secondary text-xs !py-1.5">
              {exporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />} Excel
            </button>
            <button onClick={handlePdf} disabled={exporting} className="btn-secondary text-xs !py-1.5"><FileDown size={13} /> PDF</button>
            <button onClick={() => { setEditItem(null); setForm({ ...blank }); setShowAdd(true) }} className="btn-primary text-xs !py-1.5"><Plus size={13} /> Add Expense</button>
          </div>
        </div>

        {loading ? <Loading /> : expenses.length === 0 ? <Empty title="No expenses found" /> : (
          <table className="w-full">
            <thead><tr className="border-b border-border bg-surface-1">
              <th className="text-left px-5 py-3 table-header">Date</th>
              <th className="text-left px-5 py-3 table-header">Category</th>
              <th className="text-left px-5 py-3 table-header">Description</th>
              <th className="text-left px-5 py-3 table-header">Payment</th>
              <th className="text-right px-5 py-3 table-header">Amount</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-border/50 hover:bg-surface-1/50">
                  <td className="px-5 py-3 text-sm text-text-secondary">{formatDate(e.date)}</td>
                  <td className="px-5 py-3"><span className="badge badge-neutral">{expenseCategoryLabel(e.category)}</span></td>
                  <td className="px-5 py-3 text-sm text-text-primary">{e.description}</td>
                  <td className="px-5 py-3 text-sm text-text-secondary">{paymentMethodLabel(e.paymentMethod)}</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-danger">{formatCurrency(e.amount)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-0.5 justify-end">
                      <button onClick={() => setViewItem(e)} title="View" className="btn-ghost !px-2 !py-1.5"><Eye size={15} /></button>
                      <button onClick={() => { setEditItem(e); setForm({ category: e.category, description: e.description, amount: String(e.amount), paymentMethod: e.paymentMethod || 'cash', date: toDateInput(e.date), isRecurring: !!e.isRecurring, recurringPeriod: e.recurringPeriod || 'monthly', notes: e.notes || '' }); setShowAdd(true) }} title="Edit" className="btn-ghost !px-2 !py-1.5"><Edit size={15} /></button>
                      <button onClick={() => remove(e.id)} title="Delete" className="btn-ghost !px-2 !py-1.5 text-danger"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditItem(null) }} title={editItem ? 'Edit Expense' : 'Add Expense'}>
        <div className="space-y-3">
          <div><label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{expenseCategoryLabel(c)}</option>)}
            </select>
          </div>
          <div><label className="label">Description *</label><input className="input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount (Rs.) *</label><input type="number" className="input" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></div>
            <div><label className="label">Payment Method</label>
              <select className="input" value={form.paymentMethod} onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} /></div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="rec" checked={form.isRecurring} onChange={(e) => setForm((p) => ({ ...p, isRecurring: e.target.checked }))} />
            <label htmlFor="rec" className="text-sm text-text-primary">Recurring expense</label>
          </div>
          {form.isRecurring && (
            <div><label className="label">Period</label>
              <select className="input" value={form.recurringPeriod} onChange={(e) => setForm((p) => ({ ...p, recurringPeriod: e.target.value }))}>
                <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
              </select>
            </div>
          )}
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => { setShowAdd(false); setEditItem(null) }}>Cancel</button>
            <button className="btn-primary" onClick={save}>{editItem ? 'Save Changes' : 'Add Expense'}</button>
          </div>
        </div>
      </Modal>

      <DetailModal open={!!viewItem} onClose={() => setViewItem(null)} title="Expense Details" rows={viewItem ? [
        { label: 'Date', value: formatDate(viewItem.date) },
        { label: 'Category', value: expenseCategoryLabel(viewItem.category) },
        { label: 'Description', value: viewItem.description },
        { label: 'Amount', value: formatCurrency(viewItem.amount) },
        { label: 'Payment Method', value: paymentMethodLabel(viewItem.paymentMethod) },
        { label: 'Recurring', value: viewItem.isRecurring ? `Yes (${viewItem.recurringPeriod || 'monthly'})` : 'No' },
        { label: 'Notes', value: viewItem.notes || '-' },
        { label: 'Created', value: formatDate(viewItem.createdAt) },
      ] : []} />
    </div>
  )
}
