/**
 * Demo tenant seed script.
 * Run: node scripts/seed-demo.mjs
 *
 * Requires: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env
 * Populates: tenants/demo/{customers,transactions,invoices,expenses,pdc}
 *
 * Safe to re-run: clears existing demo data first, then re-seeds.
 * NEVER touches production (top-level) collections.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

// Load .env manually (no dotenv dependency)
try {
  const env = readFileSync(resolve(__dir, '../.env'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) {
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      process.env[m[1]] = v.replace(/\\n/g, '\n')
    }
  }
} catch { /* .env missing — rely on env already set */ }

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({ credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  })})
}

const db = getFirestore()
const TENANT = 'demo'
const root = db.collection('tenants').doc(TENANT)

function id() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function ts(date) { return Timestamp.fromDate(new Date(date)) }

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d
}

// ---- Clear existing demo data -----------------------------------------------
async function clearCollection(name) {
  const snap = await root.collection(name).get()
  const batch = db.batch()
  snap.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()
  console.log(`Cleared ${snap.size} docs from demo/${name}`)
}

await clearCollection('customers')
await clearCollection('transactions')
await clearCollection('invoices')
await clearCollection('expenses')
await clearCollection('pdc')

// ---- Customers --------------------------------------------------------------
const customers = [
  { id: id(), name: 'Karachi Fish Traders', phone: '0300-1234567', address: 'Saddar, Karachi', openingBalance: 85000, balanceType: 'debit' },
  { id: id(), name: 'Lahore Seafood Hub', phone: '0321-9876543', address: 'MM Alam Road, Lahore', openingBalance: 42000, balanceType: 'debit' },
  { id: id(), name: 'Islamabad Marine Co.', phone: '0333-4445555', address: 'Blue Area, Islamabad', openingBalance: 15000, balanceType: 'credit' },
  { id: id(), name: 'Multan Cold Storage', phone: '0311-2223334', address: 'Bosan Road, Multan', openingBalance: 0, balanceType: 'debit' },
  { id: id(), name: 'Peshawar Exports Ltd.', phone: '0312-5556667', address: 'Ring Road, Peshawar', openingBalance: 120000, balanceType: 'debit' },
  { id: id(), name: 'Quetta Fish Market', phone: '0345-1112223', address: 'Jinnah Road, Quetta', openingBalance: 30000, balanceType: 'credit' },
  { id: id(), name: 'Faisalabad Distributors', phone: '0301-7778889', address: 'Kohinoor City, Faisalabad', openingBalance: 55000, balanceType: 'debit' },
  { id: id(), name: 'Hyderabad Fresh Fish', phone: '0333-0001112', address: 'Latifabad, Hyderabad', openingBalance: 18000, balanceType: 'debit' },
  { id: id(), name: 'Sialkot Trading Co.', phone: '0322-4445556', address: 'Paris Road, Sialkot', openingBalance: 8000, balanceType: 'credit' },
  { id: id(), name: 'Gujranwala Wholesale', phone: '0300-9990001', address: 'GT Road, Gujranwala', openingBalance: 0, balanceType: 'debit' },
]

const now = new Date()
for (const c of customers) {
  await root.collection('customers').doc(c.id).set({
    name: c.name, phone: c.phone, address: c.address,
    openingBalance: c.openingBalance, balanceType: c.balanceType,
    createdAt: ts(daysAgo(90)), updatedAt: ts(daysAgo(90)),
  })
}
console.log(`Seeded ${customers.length} customers`)

// ---- Transactions -----------------------------------------------------------
const transactions = []
const txnData = [
  { cIdx: 0, type: 'debit',  amount: 25000, desc: 'Supply of Hammour Fish 50kg',  days: 60 },
  { cIdx: 0, type: 'credit', amount: 40000, desc: 'Payment received - Bank Transfer', days: 50 },
  { cIdx: 0, type: 'debit',  amount: 60000, desc: 'Supply of Shrimp 100kg',        days: 30 },
  { cIdx: 1, type: 'debit',  amount: 18000, desc: 'Salmon Fillet 30kg',             days: 45 },
  { cIdx: 1, type: 'credit', amount: 10000, desc: 'Partial payment - Cash',         days: 35 },
  { cIdx: 1, type: 'debit',  amount: 22000, desc: 'Tuna 40kg',                      days: 20 },
  { cIdx: 2, type: 'credit', amount: 5000,  desc: 'Payment advance',                days: 70 },
  { cIdx: 3, type: 'debit',  amount: 35000, desc: 'Crab 60kg',                      days: 25 },
  { cIdx: 3, type: 'credit', amount: 35000, desc: 'Full payment received',           days: 10 },
  { cIdx: 4, type: 'debit',  amount: 75000, desc: 'Export order - Mixed Fish',      days: 40 },
  { cIdx: 4, type: 'credit', amount: 20000, desc: 'Partial payment - Cheque',       days: 25 },
  { cIdx: 5, type: 'credit', amount: 15000, desc: 'Advance payment',                days: 55 },
  { cIdx: 6, type: 'debit',  amount: 48000, desc: 'Hilsa Fish 80kg',                days: 30 },
  { cIdx: 6, type: 'credit', amount: 30000, desc: 'Payment - Bank',                 days: 15 },
  { cIdx: 7, type: 'debit',  amount: 12000, desc: 'Rohu Fish 20kg',                 days: 20 },
  { cIdx: 8, type: 'credit', amount: 3000,  desc: 'Credit note adjustment',         days: 40 },
  { cIdx: 9, type: 'debit',  amount: 28000, desc: 'Wholesale order - Pomfret',      days: 7 },
  { cIdx: 9, type: 'credit', amount: 10000, desc: 'Down payment received',          days: 3 },
]

for (const t of txnData) {
  const cust = customers[t.cIdx]
  const txnId = id()
  transactions.push(txnId)
  await root.collection('transactions').doc(txnId).set({
    customerId: cust.id,
    type: t.type,
    amount: t.amount,
    description: t.desc,
    date: ts(daysAgo(t.days)),
    createdAt: ts(daysAgo(t.days)),
    updatedAt: ts(daysAgo(t.days)),
  })
}
console.log(`Seeded ${transactions.length} transactions`)

// ---- Invoices ---------------------------------------------------------------
const invoiceData = [
  { num: 'INV-0001', cust: customers[0].name, amount: 85000, paid: 85000, days: 80, due: 50 },
  { num: 'INV-0002', cust: customers[1].name, amount: 42000, paid: 30000, days: 70, due: 40 },
  { num: 'INV-0003', cust: customers[4].name, amount: 120000, paid: 0,    days: 60, due: 30 },
  { num: 'INV-0004', cust: customers[2].name, amount: 15000,  paid: 15000,days: 55, due: 25 },
  { num: 'INV-0005', cust: customers[6].name, amount: 55000,  paid: 25000,days: 40, due: 10 },
  { num: 'INV-0006', cust: customers[3].name, amount: 35000,  paid: 35000,days: 35, due: 5 },
  { num: 'INV-0007', cust: customers[7].name, amount: 18000,  paid: 0,    days: 20, due: -5 }, // overdue
  { num: 'INV-0008', cust: customers[9].name, amount: 28000,  paid: 10000,days: 7,  due: -3 }, // overdue
  { num: 'INV-0009', cust: customers[5].name, amount: 30000,  paid: 30000,days: 15, due: -10 },
  { num: 'INV-0010', cust: customers[8].name, amount: 8000,   paid: 5000, days: 5,  due: 25 },
]

function invStatus(amount, paid, dueDate) {
  if (paid >= amount && amount > 0) return 'paid'
  if (dueDate < now && paid < amount) return 'overdue'
  if (paid > 0) return 'partial'
  return 'unpaid'
}

for (const i of invoiceData) {
  const invDate = daysAgo(i.days)
  const dueDate = new Date(invDate); dueDate.setDate(dueDate.getDate() + (i.days - i.due))
  await root.collection('invoices').doc(id()).set({
    invoiceNumber: i.num, customerName: i.cust,
    date: ts(invDate), dueDate: ts(dueDate),
    amount: i.amount, paidAmount: i.paid,
    status: invStatus(i.amount, i.paid, dueDate),
    notes: null,
    createdAt: ts(invDate), updatedAt: ts(invDate),
  })
}
console.log(`Seeded ${invoiceData.length} invoices`)

// ---- Expenses ---------------------------------------------------------------
const expenseData = [
  { cat: 'rent',       desc: 'Office Rent - Monthly',      amount: 45000, days: 35, method: 'bank' },
  { cat: 'salaries',   desc: 'Staff Salaries - October',   amount: 120000,days: 30, method: 'bank' },
  { cat: 'utilities',  desc: 'Electricity Bill',           amount: 8500,  days: 28, method: 'cash' },
  { cat: 'fuel',       desc: 'Delivery Van Fuel',          amount: 6000,  days: 22, method: 'cash' },
  { cat: 'packaging',  desc: 'Ice & Packaging Material',   amount: 12000, days: 18, method: 'cash' },
  { cat: 'salaries',   desc: 'Staff Salaries - November',  amount: 120000,days: 5,  method: 'bank' },
  { cat: 'logistics',  desc: 'Cargo Charges - Karachi',    amount: 9500,  days: 12, method: 'bank' },
  { cat: 'maintenance',desc: 'Cold Storage Repair',        amount: 15000, days: 8,  method: 'cash' },
  { cat: 'rent',       desc: 'Office Rent - November',     amount: 45000, days: 5,  method: 'bank' },
  { cat: 'utilities',  desc: 'Water & Gas Bill',           amount: 3200,  days: 3,  method: 'cash' },
  { cat: 'fuel',       desc: 'Generator Fuel',             amount: 4500,  days: 2,  method: 'cash' },
  { cat: 'general',    desc: 'Miscellaneous Office Costs', amount: 2500,  days: 1,  method: 'cash' },
]

for (const e of expenseData) {
  const expDate = daysAgo(e.days)
  await root.collection('expenses').doc(id()).set({
    category: e.cat, description: e.desc,
    amount: e.amount, paymentMethod: e.method,
    date: ts(expDate), isRecurring: e.cat === 'rent' || e.cat === 'salaries',
    recurringPeriod: (e.cat === 'rent' || e.cat === 'salaries') ? 'monthly' : null,
    notes: null,
    createdAt: ts(expDate), updatedAt: ts(expDate),
  })
}
console.log(`Seeded ${expenseData.length} expenses`)

// ---- PDC Cheques ------------------------------------------------------------
const pdcData = [
  { type: 'receivable', party: 'Karachi Fish Traders', cheque: 'CHQ-001', bank: 'HBL', amount: 50000, days: -15 }, // future
  { type: 'receivable', party: 'Lahore Seafood Hub',   cheque: 'CHQ-002', bank: 'MCB', amount: 30000, days: -7 },  // future
  { type: 'receivable', party: 'Peshawar Exports Ltd.',cheque: 'CHQ-003', bank: 'UBL', amount: 75000, days: -30 }, // future
  { type: 'receivable', party: 'Gujranwala Wholesale', cheque: 'CHQ-007', bank: 'ABL', amount: 28000, days: 5 },   // near-due
  { type: 'payable',    party: 'Rawalpindi Trawlers',  cheque: 'CHQ-004', bank: 'HBL', amount: 40000, days: -10 }, // future payable
  { type: 'payable',    party: 'Gawadar Fisheries',    cheque: 'CHQ-005', bank: 'Meezan', amount: 25000, days: 3 },// slightly overdue
  { type: 'payable',    party: 'Mirpur Khas Cold Chain',cheque:'CHQ-006', bank: 'JS Bank', amount: 18000, days: 20},// past cleared
]
const pdcStatuses = ['pending', 'pending', 'pending', 'pending', 'pending', 'returned', 'cleared']

for (let i = 0; i < pdcData.length; i++) {
  const p = pdcData[i]
  const chequeDate = new Date(); chequeDate.setDate(chequeDate.getDate() + p.days)
  await root.collection('pdc').doc(id()).set({
    pdcType: p.type, partyName: p.party,
    chequeNumber: p.cheque, bank: p.bank,
    amount: p.amount, chequeDate: ts(chequeDate),
    status: pdcStatuses[i], remarks: null,
    createdAt: ts(daysAgo(45)), updatedAt: ts(daysAgo(45)),
  })
}
console.log(`Seeded ${pdcData.length} PDC cheques`)

console.log('\n✅ Demo tenant seeded successfully under tenants/demo/')
console.log('   PIN 5555 → will open this demo dataset')
