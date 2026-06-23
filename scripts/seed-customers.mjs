// One-time customer import seed (Firestore).
// Usage (env from .env or shell):
//   FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY=... \
//     node scripts/seed-customers.mjs
//
// Idempotent by name: existing customers are updated, not duplicated.
// Opening balance is stored on the Customer and shown as the first ledger row
// by the statement. balanceType "debit" = receivable, "credit" = payable.
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'

// Load .env if present (so `node scripts/seed-customers.mjs` works locally).
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) {
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      process.env[m[1]] = v
    }
  }
} catch {}

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY')
  process.exit(1)
}
if (!getApps().length) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
const db = getFirestore()

const newId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)

const CUSTOMERS = [
  { name: 'Akash Farooq', balanceType: 'debit', openingBalance: 1209000 },
  { name: 'Amjad Maya', balanceType: 'debit', openingBalance: 2939000 },
  { name: 'Asif Memon', balanceType: 'debit', openingBalance: 374000 },
  { name: 'Bacho Dewan (Night Gujha Market)', balanceType: 'debit', openingBalance: 15000 },
  { name: 'Bacho Dewan Guja Market', balanceType: 'debit', openingBalance: 164000 },
  { name: 'Biryani wala', balanceType: 'credit', openingBalance: 22000 },
  { name: 'Hafiz Jarman (Chokri)', balanceType: 'debit', openingBalance: 86000 },
  { name: 'Hanif Alauddin', balanceType: 'debit', openingBalance: 649000 },
  { name: 'Junaid Qadri', balanceType: 'debit', openingBalance: 10000 },
  { name: 'Mujeeb Kachra Chokri', balanceType: 'debit', openingBalance: 341500 },
  { name: 'Muna Barik', balanceType: 'debit', openingBalance: 86000 },
  { name: 'Mustaqeem Chilton', balanceType: 'debit', openingBalance: 18000 },
  { name: 'Qadri Parchi', balanceType: 'debit', openingBalance: 3080000 },
  { name: 'Rafiq PK Chokri', balanceType: 'debit', openingBalance: 840000 },
  { name: 'Rathore', balanceType: 'debit', openingBalance: 3625000 },
  { name: 'Rathore Extra Loan', balanceType: 'credit', openingBalance: 3000000 },
  { name: 'Rehman Qalam Bro', balanceType: 'debit', openingBalance: 135500 },
  { name: 'Shahjhan Maya', balanceType: 'credit', openingBalance: 124000 },
  { name: 'Shehzad Mujhid e Rasool', balanceType: 'debit', openingBalance: 360000 },
  { name: 'Sudais', balanceType: 'debit', openingBalance: 185800 },
  { name: 'Zubair (Kachra)', balanceType: 'debit', openingBalance: 48000 },
  { name: 'Shahjhan 20/30 Night Market', balanceType: 'debit', openingBalance: 80000 },
]

async function main() {
  const col = db.collection('customers')
  let created = 0, updated = 0
  for (const c of CUSTOMERS) {
    const snap = await col.where('name', '==', c.name).limit(1).get()
    const now = Timestamp.now()
    if (!snap.empty) {
      await snap.docs[0].ref.set({ ...c, updatedAt: now }, { merge: true })
      updated++
    } else {
      await col.doc(newId()).set({ ...c, phone: null, address: null, createdAt: now, updatedAt: now })
      created++
    }
  }

  const all = (await col.get()).docs.map((d) => d.data())
  let debit = 0, credit = 0
  for (const c of all) {
    const b = c.balanceType === 'credit' ? -c.openingBalance : c.openingBalance
    if (b >= 0) debit += b; else credit += -b
  }

  console.log(`Created: ${created}, Updated: ${updated}, Total parties: ${all.length}`)
  console.log(`Total Debit (Receivable): ${debit.toLocaleString()}`)
  console.log(`Total Credit (Payable):   ${credit.toLocaleString()}`)
  console.log(`Net Balance: ${(debit - credit).toLocaleString()} ${debit - credit >= 0 ? 'Receivable' : 'Payable'}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
