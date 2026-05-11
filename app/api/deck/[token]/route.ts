import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'

// GET — public deck data (no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const deck = await db.deck.findUnique({
    where: { shareToken: token },
    include: { pitch: { include: { theme: true } } },
  })

  if (!deck || !deck.publishedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    sections: deck.pitch.sections,
    themeName: deck.pitch.theme.name,
  })
}

// POST — publish deck (auth required)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await params

  // Verify the deck belongs to this org
  const org = await db.org.findUnique({ where: { clerkOrgId: orgId } })
  if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deck = await db.deck.findUnique({
    where: { shareToken: token },
    include: { pitch: { select: { orgId: true } } },
  })
  if (!deck || deck.pitch.orgId !== org.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.deck.update({
    where: { shareToken: token },
    data: { publishedAt: new Date() },
  })

  return NextResponse.json({ published: true })
}
