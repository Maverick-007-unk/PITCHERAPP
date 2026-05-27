import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { generatePptx } from '@/lib/export/pptx'
import { generatePdf } from '@/lib/export/pdf'
import { getDownloadUrl } from '@/lib/storage/r2'
import type { SlideData } from '@/lib/deck/types'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  const format = req.nextUrl.searchParams.get('format')

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (format !== 'pdf' && format !== 'pptx') {
    return NextResponse.json({ error: 'format must be pdf or pptx' }, { status: 400 })
  }

  const org = await db.org.findUnique({ where: { clerkOrgId: orgId } })
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const pitch = await db.pitch.findUnique({
    where: { id, orgId: org.id },
    include: { deck: true },
  })
  if (!pitch || !pitch.deck) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!pitch.deck.publishedAt) {
    return NextResponse.json({ error: 'Publish the deck before exporting' }, { status: 400 })
  }
  if (!pitch.deck.slideData) {
    return NextResponse.json({ error: 'Deck not initialized' }, { status: 400 })
  }

  const slideData = pitch.deck.slideData as unknown as SlideData

  if (format === 'pptx') {
    const getImageBuffer = async (storageKey: string): Promise<Buffer> => {
      const url = await getDownloadUrl(storageKey)
      const res = await fetch(url)
      return Buffer.from(await res.arrayBuffer())
    }
    const buffer = await generatePptx(slideData, getImageBuffer)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': 'attachment; filename="pitch.pptx"',
      },
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL not configured' }, { status: 500 })

  const deckUrl = `${appUrl}/deck/${pitch.deck.shareToken}?print=1`
  const buffer = await generatePdf(deckUrl)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="pitch.pdf"',
    },
  })
}
