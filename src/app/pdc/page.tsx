'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Download, RefreshCw, Trash2, CreditCard, FileDown, Eye, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { downloadExcel } from '@/lib/export'
import { printTableReport, fmt } from '@/lib/print'
import { useShell } from '@/components/AppShell'
import { Modal, Loading, Empty, DetailModal } from '@/components/ui'
import { formatCurrency, formatDate, toDateInput } from '@/lib/utils'

const blank = { pdcType: 'receivable', partyName: '', chequeNumber: '', bank: '', amount: '', chequeDate: new Date().toISOString().split('T')[0], status: 'pending', remarks: '' }
const STATUS = ['pending', 'cleared', 'bounced']

export default function PDCPage() {
  const { refreshKey } = useShell()
  const [tab, setTab] = useState<'receivable' | 'payable'>('receivable')
  const [all, setAll] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [viewItem, setViewItem] = useState<any>(null)
  const [form, setForm] = useState({ ...blank })

  const load = useCallback(() => {
    setLoading(true)
    api.getPDC().then((d) => setAll(d || [])).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [refreshKey, load])

  const rows = all.filter((p) => p.pdcType === tab)
  const totalRec = all.filter((p) => p.pdcType === 'receivable').reduce((s, p) => s + p.amount, 0)
  const totalPay = all.filter((p) => p.pdcType === 'payable').reduce((s, p) => s + p.amount, 0)
  const pendRec = all.filter((p) => p.pdcType === 'receivable' && p.status === 'pending').length
  const pendPay = all.filter((p) => p.pdcType === 'payable' && p.status === 'pending').length

  const save = async () => {
    if (!form.partyName) return toast.error('Party name required')
    try {
      const payload = { ...form, amount: Number(form.amount) }
      const res = editItem ? await api.updatePDC(editItem.id, payload) : await api.addPDC(payload)
      if (res?.success) { toast.success(editItem ? 'Updated' : 'PDC added'); setShowAdd(false); setEditItem(null); setForm({ ...blank }); load() }
    } catch (e: any) { toast.error(e.message || 'Failed') }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this PDC cheque?')) return
    try { await api.deletePDC(id); toast.success('Deleted'); load() }
    catch (e: any) { toast.error(e.message || 'Failed') }
  }

  const setStatus = async (p: any, status: string) => {
    try { await api.updatePDC(p.id, { ...p, status }); load() }
    catch { toast.error('Failed') }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await api.getPDC() // all records, both tabs
      await downloadExcel(
        `PDC_${new Date().toISOString().split('T')[0]}.xlsx`,
        'PDC Cheques',
        [
          { header: 'Type', key: 'pdcType', width: 14 },
          { header: 'Party Name', key: 'partyName', width: 24 },
          { header: 'Cheque Number', key: 'chequeNumber', width: 18 },
          { header: 'Bank', key: 'bank', width: 20 },
          { header: 'Amount', key: 'amount', width: 16 },
          { header: 'Cheque Date', key: 'chequeDate', width: 14 },
          { header: 'Status', key: 'status', width: 14 },
          { header: 'Remarks', key: 'remarks', width: 28 },
        ],
        (data || []).map((p: any) => ({
          pdcType: p.pdcType === 'payable' ? 'Payable' : 'Receivable',
          partyName: p.partyName, chequeNumber: p.chequeNumber || '', bank: p.bank || '',
          amount: p.amount, chequeDate: formatDate(p.chequeDate), status: p.status, remarks: p.remarks || '',
        })),
      )
      toast.success('Exported')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const handlePdf = async () => {
    setExporting(true)
    try {
      const data = await api.getPDC() // all records, both tabs
      printTableReport(
        'PDC Cheques Report',
        [
          { header: 'Type', key: 'type' },
          { header: 'Party Name', key: 'partyName' },
          { header: 'Cheque #', key: 'chequeNumber' },
          { header: 'Bank', key: 'bank' },
          { header: 'Cheque Date', key: 'chequeDate' },
          { header: 'Status', key: 'status' },
          { header: 'Amount', key: 'amount', align: 'right' },
        ],
        (data || []).map((p: any) => ({
          type: p.pdcType === 'payable' ? 'Payable' : 'Receivable', partyName: p.partyName,
          chequeNumber: p.chequeNumber || '-', bank: p.bank || '-', chequeDate: formatDate(p.chequeDate),
          status: p.status, amount: fmt(p.amount),
        })),
        { total: { label: 'Total', value: fmt((data || []).reduce((s: number, p: any) => s + p.amount, 0)) } },
      )
    } catch { toast.error('PDF failed') }
    finally { setExporting(false) }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-enter">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">PDC Receivable</p><p className="text-2xl font-bold text-success">{formatCurrency(totalRec, true)}</p></div>
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">PDC Payable</p><p className="text-2xl font-bold text-danger">{formatCurrency(totalPay, true)}</p></div>
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Pending Receivable</p><p className="text-2xl font-bold">{pendRec}</p></div>
        <div className="card p-5"><p className="text-xs text-text-muted mb-1">Pending Payable</p><p className="text-2xl font-bold">{pendPay}</p></div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3 border-b border-border gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setTab('receivable')} className={tab === 'receivable' ? 'btn-primary text-xs !py-1.5' : 'btn-ghost text-xs !py-1.5'}>PDC Receivable</button>
            <button onClick={() => setTab('payable')} className={tab === 'payable' ? 'btn-primary text-xs !py-1.5' : 'btn-ghost text-xs !py-1.5'}>PDC Payable</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleExport} disabled={exporting} className="btn-secondary text-xs !py-1.5">
              {exporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />} Excel
            </button>
            <button onClick={handlePdf} disabled={exporting} className="btn-secondary text-xs !py-1.5"><FileDown size={13} /> PDF</button>
            <button onClick={() => { setEditItem(null); setForm({ ...blank, pdcType: tab }); setShowAdd(true) }} className="btn-primary text-xs !py-1.5"><Plus size={13} /> Add PDC Cheque</button>
          </div>
        </div>

        {loading ? <Loading /> : rows.length === 0 ? (
          <Empty title='No PDC cheques yet. Click "Add PDC Cheque" to get started.' icon={<CreditCard size={40} className="opacity-40" />} />
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-border bg-surface-1">
              <th className="text-left px-5 py-3 table-header">Party Name</th>
              <th className="text-left px-5 py-3 table-header">Cheque #</th>
              <th className="text-left px-5 py-3 table-header">Bank</th>
              <th className="text-left px-5 py-3 table-header">Cheque Date</th>
              <th className="text-right px-5 py-3 table-header">Amount</th>
              <th className="text-left px-5 py-3 table-header">Status</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-surface-1/50">
                  <td className="px-5 py-3 text-sm font-medium text-text-primary">{p.partyName}</td>
                  <td className="px-5 py-3 text-sm text-text-secondary">{p.chequeNumber || '-'}</td>
                  <td className="px-5 py-3 text-sm text-text-secondary">{p.bank || '-'}</td>
                  <td className="px-5 py-3 text-sm text-text-secondary">{formatDate(p.chequeDate)}</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold">{formatCurrency(p.amount)}</td>
                  <td className="px-5 py-3">
                    <select value={p.status} onChange={(e) => setStatus(p, e.target.value)}
                      className={`badge ${p.status === 'cleared' ? 'badge-success' : p.status === 'bounced' ? 'badge-danger' : 'badge-warning'} !border-0 cursor-pointer`}>
                      {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setViewItem(p)} title="View" className="btn-ghost !px-2 !py-1.5"><Eye size={15} /></button>
                      <button onClick={() => { setEditItem(p); setForm({ pdcType: p.pdcType, partyName: p.partyName, chequeNumber: p.chequeNumber || '', bank: p.bank || '', amount: String(p.amount), chequeDate: toDateInput(p.chequeDate), status: p.status, remarks: p.remarks || '' }); setShowAdd(true) }} title="Edit" className="btn-ghost !px-2 !py-1.5"><Pencil size={15} /></button>
                      <button onClick={() => remove(p.id)} title="Delete" className="btn-ghost !px-2 !py-1.5 text-danger"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditItem(null) }} title={editItem ? 'Edit PDC Cheque' : 'Add PDC Cheque'}>
        <div className="space-y-3">
          <div><label className="label">Type</label>
            <select className="input" value={form.pdcType} onChange={(e) => setForm((p) => ({ ...p, pdcType: e.target.value }))}>
              <option value="receivable">Receivable</option><option value="payable">Payable</option>
            </select>
          </div>
          <div><label className="label">Party Name *</label><input className="input" value={form.partyName} onChange={(e) => setForm((p) => ({ ...p, partyName: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Cheque Number</label><input className="input" value={form.chequeNumber} onChange={(e) => setForm((p) => ({ ...p, chequeNumber: e.target.value }))} /></div>
            <div><label className="label">Bank</label><input className="input" value={form.bank} onChange={(e) => setForm((p) => ({ ...p, bank: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount *</label><input type="number" className="input" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></div>
            <div><label className="label">Cheque Date</label><input type="date" className="input" value={form.chequeDate} onChange={(e) => setForm((p) => ({ ...p, chequeDate: e.target.value }))} /></div>
          </div>
          <div><label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="label">Remarks</label><textarea className="input" rows={2} value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => { setShowAdd(false); setEditItem(null) }}>Cancel</button>
            <button className="btn-primary" onClick={save}>{editItem ? 'Save Changes' : 'Add PDC'}</button>
          </div>
        </div>
      </Modal>

      <DetailModal open={!!viewItem} onClose={() => setViewItem(null)} title="PDC Cheque Details" rows={viewItem ? [
        { label: 'Type', value: viewItem.pdcType === 'payable' ? 'Payable' : 'Receivable' },
        { label: 'Party Name', value: viewItem.partyName },
        { label: 'Cheque Number', value: viewItem.chequeNumber || '-' },
        { label: 'Bank', value: viewItem.bank || '-' },
        { label: 'Amount', value: formatCurrency(viewItem.amount) },
        { label: 'Cheque Date', value: formatDate(viewItem.chequeDate) },
        { label: 'Status', value: viewItem.status },
        { label: 'Remarks', value: viewItem.remarks || '-' },
      ] : []} />
    </div>
  )
}
