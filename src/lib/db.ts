// Firestore-backed data access mirroring the small slice of Prisma the API
// routes used. Collections: customers, transactions, invoices, expenses, pdc,
// settings. Timestamps are converted to/from JS Date by the firestore helpers.
import { fdb, newId, toFs, docToObj } from './firestore'

const COL = {
  customer: 'customers',
  transaction: 'transactions',
  invoice: 'invoices',
  expense: 'expenses',
  pdc: 'pdc',
  settings: 'settings',
} as const

async function all(col: string): Promise<any[]> {
  const snap = await fdb().collection(col).get()
  return snap.docs.map(docToObj)
}

async function getById(col: string, id: string): Promise<any | null> {
  const d = await fdb().collection(col).doc(id).get()
  return d.exists ? docToObj(d) : null
}

async function create(col: string, data: Record<string, any>): Promise<any> {
  const id = newId()
  const now = new Date()
  const payload = { createdAt: now, updatedAt: now, ...data }
  await fdb().collection(col).doc(id).set(toFs(payload))
  return { id, ...payload }
}

async function update(col: string, id: string, data: Record<string, any>): Promise<void> {
  await fdb().collection(col).doc(id).set(toFs({ ...data, updatedAt: new Date() }), { merge: true })
}

async function remove(col: string, id: string): Promise<void> {
  await fdb().collection(col).doc(id).delete()
}

// ---- Customers (with embedded-by-query transactions) -----------------------

export const customers = {
  async findManyWithTxns(): Promise<any[]> {
    const [custs, txns] = await Promise.all([all(COL.customer), all(COL.transaction)])
    const byCust: Record<string, any[]> = {}
    for (const t of txns) (byCust[t.customerId] ||= []).push(t)
    return custs.map((c) => ({ ...c, transactions: byCust[c.id] || [] }))
  },
  async findMany(): Promise<any[]> {
    return all(COL.customer)
  },
  async findByName(name: string): Promise<any | null> {
    const snap = await fdb().collection(COL.customer).where('name', '==', name).limit(1).get()
    return snap.empty ? null : docToObj(snap.docs[0])
  },
  async findWithTxns(id: string): Promise<any | null> {
    const c = await getById(COL.customer, id)
    if (!c) return null
    const snap = await fdb().collection(COL.transaction).where('customerId', '==', id).get()
    const transactions = snap.docs.map(docToObj).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
    return { ...c, transactions }
  },
  create: (data: any) => create(COL.customer, data),
  update: (id: string, data: any) => update(COL.customer, id, data),
  async remove(id: string): Promise<void> {
    // Cascade-delete the customer's transactions (Prisma did onDelete: Cascade).
    const snap = await fdb().collection(COL.transaction).where('customerId', '==', id).get()
    const batch = fdb().batch()
    snap.docs.forEach((d) => batch.delete(d.ref))
    batch.delete(fdb().collection(COL.customer).doc(id))
    await batch.commit()
  },
  count: async () => (await all(COL.customer)).length,
}

export const transactions = {
  create: (data: any) => create(COL.transaction, data),
  remove: (id: string) => remove(COL.transaction, id),
}

export const invoices = {
  findMany: () => all(COL.invoice),
  create: (data: any) => create(COL.invoice, data),
  update: (id: string, data: any) => update(COL.invoice, id, data),
  remove: (id: string) => remove(COL.invoice, id),
}

export const expenses = {
  findMany: () => all(COL.expense),
  create: (data: any) => create(COL.expense, data),
  update: (id: string, data: any) => update(COL.expense, id, data),
  remove: (id: string) => remove(COL.expense, id),
}

export const pdc = {
  findMany: () => all(COL.pdc),
  create: (data: any) => create(COL.pdc, data),
  update: (id: string, data: any) => update(COL.pdc, id, data),
  remove: (id: string) => remove(COL.pdc, id),
}
