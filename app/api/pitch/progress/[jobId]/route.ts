import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await params
  const pitch = await db.pitch.findUnique({ where: { id: jobId }, select: { status: true } })
  if (!pitch) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ status: pitch.status })
}
