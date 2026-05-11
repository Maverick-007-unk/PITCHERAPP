import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await db.org.findUnique({ where: { clerkOrgId: orgId } })
  if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await params
  const pitch = await db.pitch.findUnique({
    where: { id: jobId, orgId: org.id },
    select: { status: true },
  })
  if (!pitch) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ status: pitch.status })
}
