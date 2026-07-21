import { NextRequest, NextResponse } from 'next/server'
import { makeDb } from '@/lib/db'
import { getServerAccount } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const s = getServerAccount()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = makeDb(s.tenantId)

    const body = await req.json()
    const rows: any[] = Array.isArray(body) ? body : body?.customers
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Provide a non-empty customers array' }, { status: 400 })
    }

    let created = 0, updated = 0
    const errors: string[] = []

    for (const r of rows) {
      const name = String(r.name || '').trim()
      if (!name) { errors.push('Skipped a row with no name'); continue }
      const raw = String(r.balanceType || 'debit').toLowerCase()
      const balanceType = raw === 'credit' || raw === 'payable' ? 'credit' : 'debit'
      const openingBalance = Number(r.openingBalance) || 0
      try {
        const existing = await db.customers.findByName(name)
        const data = { name, phone: r.phone || null, address: r.address || null, openingBalance, balanceType }
        if (existing) { await db.customers.update(existing.id, data); updated++ }
        else { await db.customers.create(data); created++ }
      } catch (e: any) {
        errors.push(`${name}: ${e.message}`)
      }
    }

    const total = await db.customers.count()
    return NextResponse.json({ success: true, created, updated, total, errors })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
