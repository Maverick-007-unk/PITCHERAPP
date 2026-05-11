import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { inngest } from '@/lib/inngest/client'

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { rfpId, themeId } = body
  if (!rfpId || !themeId) return NextResponse.json({ error: 'rfpId and themeId required' }, { status: 400 })

  const org = await db.org.findUnique({ where: { clerkOrgId: orgId } })
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  // Verify the RFP belongs to this org
  const rfp = await db.rFP.findUnique({ where: { id: rfpId, orgId: org.id } })
  if (!rfp) return NextResponse.json({ error: 'RFP not found' }, { status: 404 })

  const pitch = await db.pitch.create({
    data: { orgId: org.id, rfpId, themeId, status: 'PENDING' },
  })

  try {
    const result = await inngest.send({ name: 'pitch/generate', data: { pitchId: pitch.id, orgClerkId: orgId } })
    const jobId = Array.isArray(result.ids) ? result.ids[0] : null
    if (jobId) await db.pitch.update({ where: { id: pitch.id }, data: { inngestJobId: jobId } })
  } catch (err) {
    console.error('[pitch/generate]', err)
  }

  return NextResponse.json({ pitchId: pitch.id }, { status: 201 })
}
