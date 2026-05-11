import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { buildStorageKey, uploadFile } from '@/lib/storage/r2'
import { inngest } from '@/lib/inngest/client'

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only PDF and DOCX files are supported' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = buildStorageKey(orgId, file.name)
  await uploadFile(key, buffer, file.type)

  // Ensure org record exists in our DB
  await db.org.upsert({
    where: { clerkOrgId: orgId },
    create: { clerkOrgId: orgId, name: orgId },
    update: {},
  })

  const org = await db.org.findUniqueOrThrow({ where: { clerkOrgId: orgId } })

  const rfp = await db.rFP.create({
    data: { orgId: org.id, fileName: file.name, storageKey: key, status: 'PENDING' },
  })

  await inngest.send({ name: 'rfp/parse', data: { rfpId: rfp.id, storageKey: key, fileType: file.type } })

  return NextResponse.json({ rfpId: rfp.id }, { status: 201 })
}
