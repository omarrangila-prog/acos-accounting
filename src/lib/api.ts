'use client'

async function j(url: string, opts?: RequestInit) {
  const res = await fetch(url, { cache: 'no-store', ...opts })
  if (!res.ok) {
    let msg = 'Request failed'
    try { msg = (await res.json()).error || msg } catch {}
    throw new Error(msg)
  }
  return res.json()
}

const body = (d: any) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
const put = (d: any) => ({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
const del = { method: 'DELETE' }

export const api = {
  // Dashboard / records
  getDashboard: () => j('/api/dashboard'),
  getRecords: () => j('/api/records'),

  // Customers + ledger
  getCustomers: (search?: string) => j(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getCustomer: (id: string) => j(`/api/customers/${id}`),
  addCustomer: (d: any) => j('/api/customers', body(d)),
  importCustomers: (rows: any[]) => j('/api/customers/import', body({ customers: rows })),
  updateCustomer: (id: string, d: any) => j(`/api/customers/${id}`, put(d)),
  deleteCustomer: (id: string) => j(`/api/customers/${id}`, del),
  addTransaction: (d: any) => j('/api/transactions', body(d)),
  deleteTransaction: (id: string) => j(`/api/transactions?id=${id}`, del),

  // Invoices
  getInvoices: (p?: { search?: string; status?: string }) => {
    const q = new URLSearchParams()
    if (p?.search) q.set('search', p.search)
    if (p?.status) q.set('status', p.status)
    return j(`/api/invoices${q.toString() ? `?${q}` : ''}`)
  },
  addInvoice: (d: any) => j('/api/invoices', body(d)),
  updateInvoice: (id: string, d: any) => j(`/api/invoices/${id}`, put(d)),
  deleteInvoice: (id: string) => j(`/api/invoices/${id}`, del),

  // Expenses
  getExpenses: (p?: { search?: string; category?: string }) => {
    const q = new URLSearchParams()
    if (p?.search) q.set('search', p.search)
    if (p?.category) q.set('category', p.category)
    return j(`/api/expenses${q.toString() ? `?${q}` : ''}`)
  },
  addExpense: (d: any) => j('/api/expenses', body(d)),
  updateExpense: (id: string, d: any) => j(`/api/expenses/${id}`, put(d)),
  deleteExpense: (id: string) => j(`/api/expenses/${id}`, del),

  // PDC
  getPDC: (type?: string) => j(`/api/pdc${type ? `?type=${type}` : ''}`),
  addPDC: (d: any) => j('/api/pdc', body(d)),
  updatePDC: (id: string, d: any) => j(`/api/pdc/${id}`, put(d)),
  deletePDC: (id: string) => j(`/api/pdc/${id}`, del),

  // Reports
  getReport: (p: { type: string; from?: string; to?: string }) => {
    const q = new URLSearchParams(p as any)
    return j(`/api/reports?${q}`)
  },
}
