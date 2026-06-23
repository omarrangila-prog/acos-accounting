import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Bulk-import customers. Each row carries its opening balance + balance type
// ("debit" = receivable, "credit" = payable). Opening balance is stored on the
// Customer and rendered as the first ledger row by the statement (no double count).
//
// Idempotent by name: an existing customer with the same name is updated rather
// than duplicated, so re-running the import won't create copies.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rows: any[] = Array.isArray(body) ? body : body?.customers
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Provide a non-empty customers array' }, { status: 400 })
    }

    let created = 0
    let updated = 0
    const errors: string[] = []

    for (const r of rows) {
      const name = String(r.name || '').trim()
      if (!name) { errors.push('Skipped a row with no name'); continue }

      // Accept balanceType as debit/credit OR receivable/payable.
      const raw = String(r.balanceType || 'debit').toLowerCase()
      const balanceType = raw === 'credit' || raw === 'payable' ? 'credit' : 'debit'
      const openingBalance = Number(r.openingBalance) || 0

      try {
        const existing = await prisma.customer.findFirst({ where: { name } })
        const data = {
          name,
          phone: r.phone || null,
          address: r.address || null,
          openingBalance,
          balanceType,
        }
        if (existing) {
          await prisma.customer.update({ where: { id: existing.id }, data })
          updated++
        } else {
          await prisma.customer.create({ data })
          created++
        }
      } catch (e: any) {
        errors.push(`${name}: ${e.message}`)
      }
    }

    const total = await prisma.customer.count()
    return NextResponse.json({ success: true, created, updated, total, errors })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
