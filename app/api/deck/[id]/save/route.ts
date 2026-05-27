import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import type { SlideData } from '@/lib/deck/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const org = await db.org.findUnique({ where: { clerkOrgId: orgId } })
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const deck = await db.deck.findUnique({
    where: { id },
    include: { pitch: { select: { orgId: true } } },
  })
  if (!deck || deck.pitch.orgId !== org.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let slideData: SlideData
  try {
    const body = await req.json()
    slideData = body.slideData
    if (!Array.isArray(slideData)) throw new Error('Invalid slideData')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  await db.deck.update({
    where: { id },
    data: { slideData: slideData as unknown as object },
  })

  return NextResponse.json({ ok: true })
}
