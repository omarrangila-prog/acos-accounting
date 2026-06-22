import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('search') || ''
    const category = req.nextUrl.searchParams.get('category') || ''
    const expenses = await prisma.expense.findMany({
      where: {
        AND: [
          search ? { description: { contains: search, mode: 'insensitive' } } : {},
          category ? { category } : {},
        ],
      },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(expenses)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    if (!b.description || b.amount === undefined)
      return NextResponse.json({ error: 'Description and amount required' }, { status: 400 })
    const e = await prisma.expense.create({
      data: {
        category: b.category || 'general',
        description: b.description,
        amount: Number(b.amount) || 0,
        paymentMethod: b.paymentMethod || 'cash',
        date: b.date ? new Date(b.date) : new Date(),
        isRecurring: !!b.isRecurring,
        recurringPeriod: b.isRecurring ? (b.recurringPeriod || 'monthly') : null,
        notes: b.notes || null,
      },
    })
    return NextResponse.json({ success: true, id: e.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
