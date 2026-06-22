import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json()
    await prisma.pDC.update({
      where: { id: params.id },
      data: {
        partyName: b.partyName,
        chequeNumber: b.chequeNumber || null,
        bank: b.bank || null,
        amount: Number(b.amount) || 0,
        chequeDate: b.chequeDate ? new Date(b.chequeDate) : null,
        status: b.status,
        remarks: b.remarks || null,
      },
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.pDC.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
