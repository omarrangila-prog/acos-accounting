import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Trash2, Edit, RefreshCw, X } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { api } from '../lib/api'
import { formatCurrency, formatDate, expenseCategoryLabel, EXPENSE_CATEGORIES, CAT_COLORS } from '../lib/utils'
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
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="btn-ghost !px-2 !py-2"><X size={16} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

const blankForm = { category: 'general', description: '', amount: '', date: new Date().toISOString().split('T')[0], isRecurring: false, recurringPeriod: 'monthly', notes: '' }

export function ExpensesPage() {
  const { triggerRefresh, refreshKey } = useStore()
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState({ ...blankForm })

  const load = useCallback(() => {
    setLoading(true)
    api.getExpenses({ search: search || undefined, category: filterCat || undefined }).then((e: any) => { setExpenses(e || []); setLoading(false) })
  }, [search, filterCat, refreshKey])

  useEffect(() => { load() }, [load])

  const total = expenses.reduce((s: number, e: any) => s + e.amount, 0)
  const recurring = expenses.filter((e: any) => e.isRecurring).reduce((s: number, e: any) => s + e.amount, 0)

  const chartData = EXPENSE_CATEGORIES.map(cat => ({
    label: expenseCategoryLabel(cat),
    value: expenses.filter((e: any) => e.category === cat).reduce((s: number, e: any) => s + e.amount, 0),
    color: CAT_COLORS[cat],
  })).filter(d => d.value > 0)

  const handleAdd = async () => {
    if (!form.description || !form.amount) return toast.error('Description and amount required')
    const res: any = editItem
      ? await api.updateExpense(editItem.id, { ...form, amount: Number(form.amount), isRecurring: form.isRecurring })
      : await api.addExpense({ ...form, amount: Number(form.amount), isRecurring: form.isRecurring })
    if (res?.success) { toast.success(editItem ? 'Updated' : 'Expense added'); setShowAdd(false); setEditItem(null); setForm({ ...blankForm }); triggerRefresh() }
    else toast.error('Failed')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    const res: any = await api.deleteExpense(id)
    if (res?.success) { toast.success('Deleted'); triggerRefresh() }
    else toast.error('Failed')
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-enter">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4"><p className="text-xs text-text-muted mb-1">Total Expenses</p><p className="text-2xl font-bold text-danger">{formatCurrency(total, true)}</p></div>
        <div className="card p-4"><p className="text-xs text-text-muted mb-1">Recurring</p><p className="text-2xl font-bold text-warning">{formatCurrency(recurring, true)}</p></div>
        <div className="card p-4"><p className="text-xs text-text-muted mb-1">Total Records</p><p className="text-2xl font-bold">{expenses.length}</p></div>
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card p-5">
            <p className="section-title mb-4">By Category</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={65} innerRadius={38}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v, true)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-5">
            <p className="section-title mb-4">Expense Breakdown</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => formatCurrency(v, true)} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} width={80} />
                <Tooltip formatter={(v: any) => formatCurrency(v, true)} />
                <Bar dataKey="value" radius={[0,4,4,0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <p className="section-title">Expenses</p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input placeholder="Search..." className="input pl-8 !py-1.5 text-xs w-40" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input !py-1.5 text-xs w-36" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{expenseCategoryLabel(c)}</option>)}
            </select>
            <button onClick={() => { setEditItem(null); setForm({ ...blankForm }); setShowAdd(true) }} className="btn-primary text-xs !py-1.5"><Plus size={13} /> Add Expense</button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-text-muted gap-2"><RefreshCw size={16} className="animate-spin" /><span className="text-sm">Loading...</span></div>
        ) : expenses.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-muted">No expenses yet.</div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-border bg-surface-1">
              <th className="text-left px-5 py-3 table-header">Date</th>
              <th className="text-left px-5 py-3 table-header">Category</th>
              <th className="text-left px-5 py-3 table-header">Description</th>
              <th className="text-right px-5 py-3 table-header">Amount</th>
              <th className="text-left px-5 py-3 table-header">Recurring</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody>
              {expenses.map((e: any) => (
                <tr key={e.id} className="border-b border-border/50 hover:bg-surface-1/50">
                  <td className="px-5 py-3 text-sm text-text-secondary">{formatDate(e.date)}</td>
                  <td className="px-5 py-3"><span className="badge badge-neutral">{expenseCategoryLabel(e.category)}</span></td>
                  <td className="px-5 py-3 text-sm text-text-primary">{e.description}</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-danger">{formatCurrency(e.amount)}</td>
                  <td className="px-5 py-3 text-sm text-text-secondary">{e.isRecurring ? <span className="badge-accent">Recurring</span> : '-'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditItem(e); setForm({ category: e.category, description: e.description, amount: String(e.amount), date: e.date?.split('T')[0] || '', isRecurring: !!e.isRecurring, recurringPeriod: e.recurringPeriod || 'monthly', notes: e.notes || '' }); setShowAdd(true) }} className="btn-ghost !px-2 !py-1.5"><Edit size={13} /></button>
                      <button onClick={() => handleDelete(e.id)} className="btn-ghost !px-2 !py-1.5 text-danger"><Trash2 size={13} /></button>
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
            <select className="input" value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{expenseCategoryLabel(c)}</option>)}
            </select>
          </div>
          <div><label className="label">Description *</label><input className="input" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
          <div><label className="label">Amount (Rs.) *</label><input type="number" className="input" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} /></div>
          <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="recurring" checked={form.isRecurring} onChange={e => setForm(p => ({...p, isRecurring: e.target.checked}))} />
            <label htmlFor="recurring" className="text-sm text-text-primary">Recurring expense</label>
          </div>
          {form.isRecurring && (
            <div><label className="label">Period</label>
              <select className="input" value={form.recurringPeriod} onChange={e => setForm(p => ({...p, recurringPeriod: e.target.value}))}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => { setShowAdd(false); setEditItem(null) }}>Cancel</button>
            <button className="btn-primary" onClick={handleAdd}>{editItem ? 'Save Changes' : 'Add Expense'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
