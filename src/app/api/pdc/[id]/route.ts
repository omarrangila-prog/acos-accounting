import { NextRequest, NextResponse } from 'next/server'
import { pdc } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json()
    await pdc.update(params.id, {
      partyName: b.partyName,
      chequeNumber: b.chequeNumber || null,
      bank: b.bank || null,
      amount: Number(b.amount) || 0,
      chequeDate: b.chequeDate ? new Date(b.chequeDate) : null,
      status: b.status,
      remarks: b.remarks || null,
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await pdc.remove(params.id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
