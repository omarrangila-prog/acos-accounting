// One-time customer import seed.
// Usage (against Railway or local):  DATABASE_URL=... node prisma/seed-customers.mjs
//
// Idempotent by name: existing customers are updated, not duplicated.
// Opening balance is stored on the Customer and shown as the first ledger row
// by the statement. balanceType "debit" = receivable, "credit" = payable.
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

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
  let created = 0, updated = 0
  for (const c of CUSTOMERS) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } })
    if (existing) {
      await prisma.customer.update({ where: { id: existing.id }, data: c })
      updated++
    } else {
      await prisma.customer.create({ data: c })
      created++
    }
  }

  // Verify totals.
  const all = await prisma.customer.findMany({ include: { transactions: true } })
  const net = (x) => {
    const opening = x.balanceType === 'credit' ? -x.openingBalance : x.openingBalance
    const t = x.transactions.reduce((s, tx) => s + (tx.type === 'credit' ? -tx.amount : tx.amount), 0)
    return opening + t
  }
  let debit = 0, credit = 0
  for (const c of all) { const b = net(c); if (b >= 0) debit += b; else credit += -b }

  console.log(`Created: ${created}, Updated: ${updated}, Total parties: ${all.length}`)
  console.log(`Total Debit (Receivable): ${debit.toLocaleString()}`)
  console.log(`Total Credit (Payable):   ${credit.toLocaleString()}`)
  console.log(`Net Balance: ${(debit - credit).toLocaleString()} ${debit - credit >= 0 ? 'Receivable' : 'Payable'}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
