import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { uploadFile, getDownloadUrl } from '@/lib/storage/r2'
import { randomUUID } from 'crypto'

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

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'png'
  const storageKey = `${org.id}/deck-images/${randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  await uploadFile(storageKey, buffer, file.type)
  const url = await getDownloadUrl(storageKey)

  return NextResponse.json({ storageKey, url })
}
