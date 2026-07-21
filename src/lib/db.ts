// Firestore-backed data access for the API routes.
// TENANT ISOLATION STRATEGY:
//   - cfood_production → reads/writes the existing flat top-level collections
//     (customers, transactions, invoices, expenses, pdc). No migration needed.
//   - demo (and any future tenant) → reads/writes under tenants/{tenantId}/
//     sub-collections, fully isolated from production data.
// This lets PIN 4444 work immediately with the existing real data.
import { fdb, newId, toFs, docToObj } from './firestore'

const PRODUCTION_TENANT = 'cfood_production'

const COL = {
  customer: 'customers',
  transaction: 'transactions',
  invoice: 'invoices',
  expense: 'expenses',
  pdc: 'pdc',
  settings: 'settings',
} as const

// ---- Collection reference helpers ------------------------------------------

function getColRef(tenantId: string, colName: string): FirebaseFirestore.CollectionReference {
  if (tenantId === PRODUCTION_TENANT) {
    // Production: use the existing flat top-level collections
    return fdb().collection(colName)
  }
  // All other tenants: namespaced under tenants/{tenantId}/
  return fdb().collection('tenants').doc(tenantId).collection(colName)
}

async function all(tenantId: string, colName: string): Promise<any[]> {
  const snap = await getColRef(tenantId, colName).get()
  return snap.docs.map(docToObj)
}

async function getById(tenantId: string, colName: string, id: string): Promise<any | null> {
  const d = await getColRef(tenantId, colName).doc(id).get()
  return d.exists ? docToObj(d) : null
}

async function create(tenantId: string, colName: string, data: Record<string, any>): Promise<any> {
  const id = newId()
  const now = new Date()
  const payload = { createdAt: now, updatedAt: now, ...data }
  await getColRef(tenantId, colName).doc(id).set(toFs(payload))
  return { id, ...payload }
}

async function update(tenantId: string, colName: string, id: string, data: Record<string, any>): Promise<void> {
  await getColRef(tenantId, colName).doc(id).set(toFs({ ...data, updatedAt: new Date() }), { merge: true })
}

async function remove(tenantId: string, colName: string, id: string): Promise<void> {
  await getColRef(tenantId, colName).doc(id).delete()
}

// ---- Repository factory ----------------------------------------------------
// Call makeDb(tenantId) once per request to get the tenant's repositories.

export function makeDb(tenantId: string) {
  return {
    customers: {
      async findManyWithTxns(): Promise<any[]> {
        const [custs, txns] = await Promise.all([
          all(tenantId, COL.customer),
          all(tenantId, COL.transaction),
        ])
        const byCust: Record<string, any[]> = {}
        for (const t of txns) (byCust[t.customerId] ||= []).push(t)
        return custs.map((c) => ({ ...c, transactions: byCust[c.id] || [] }))
      },
      async findMany(): Promise<any[]> {
        return all(tenantId, COL.customer)
      },
      async findByName(name: string): Promise<any | null> {
        const snap = await getColRef(tenantId, COL.customer).where('name', '==', name).limit(1).get()
        return snap.empty ? null : docToObj(snap.docs[0])
      },
      async findWithTxns(id: string): Promise<any | null> {
        const c = await getById(tenantId, COL.customer, id)
        if (!c) return null
        const snap = await getColRef(tenantId, COL.transaction).where('customerId', '==', id).get()
        const transactions = snap.docs.map(docToObj).sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        )
        return { ...c, transactions }
      },
      create: (data: any) => create(tenantId, COL.customer, data),
      update: (id: string, data: any) => update(tenantId, COL.customer, id, data),
      async remove(id: string): Promise<void> {
        const snap = await getColRef(tenantId, COL.transaction).where('customerId', '==', id).get()
        const batch = fdb().batch()
        snap.docs.forEach((d) => batch.delete(d.ref))
        batch.delete(getColRef(tenantId, COL.customer).doc(id))
        await batch.commit()
      },
      count: async () => (await all(tenantId, COL.customer)).length,
    },

    transactions: {
      create: (data: any) => create(tenantId, COL.transaction, data),
      remove: (id: string) => remove(tenantId, COL.transaction, id),
    },

    invoices: {
      findMany: () => all(tenantId, COL.invoice),
      create: (data: any) => create(tenantId, COL.invoice, data),
      update: (id: string, data: any) => update(tenantId, COL.invoice, id, data),
      remove: (id: string) => remove(tenantId, COL.invoice, id),
    },

    expenses: {
      findMany: () => all(tenantId, COL.expense),
      create: (data: any) => create(tenantId, COL.expense, data),
      update: (id: string, data: any) => update(tenantId, COL.expense, id, data),
      remove: (id: string) => remove(tenantId, COL.expense, id),
    },

    pdc: {
      findMany: () => all(tenantId, COL.pdc),
      create: (data: any) => create(tenantId, COL.pdc, data),
      update: (id: string, data: any) => update(tenantId, COL.pdc, id, data),
      remove: (id: string) => remove(tenantId, COL.pdc, id),
    },
  }
}
