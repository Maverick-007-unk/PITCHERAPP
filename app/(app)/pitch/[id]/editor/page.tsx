import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { getDownloadUrl } from '@/lib/storage/r2'
import { EditorClient } from './editor-client'
import type { SlideData, SlideElement } from '@/lib/deck/types'

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth()
  if (!orgId) redirect('/sign-in')

  const org = await db.org.findUnique({ where: { clerkOrgId: orgId } })
  if (!org) redirect('/sign-in')

  const { id } = await params
  const pitch = await db.pitch.findUnique({
    where: { id, orgId: org.id },
    include: { deck: true },
  })
  if (!pitch || !pitch.deck) notFound()
  if (!pitch.deck.slideData) redirect(`/pitch/${id}`)

  const slides = pitch.deck.slideData as unknown as SlideData

  // Pre-generate signed URLs for all image elements
  const allImageKeys = slides
    .flatMap((s) => s.elements)
    .filter((el): el is SlideElement & { storageKey: string } =>
      el.type === 'image' && !!el.storageKey
    )
    .map((el) => el.storageKey)

  const imageUrlEntries = await Promise.all(
    allImageKeys.map(async (key) => [key, await getDownloadUrl(key)] as const)
  )
  const imageUrls = Object.fromEntries(imageUrlEntries)

  return (
    <EditorClient
      deckId={pitch.deck.id}
      pitchId={pitch.id}
      initialSlides={slides}
      shareToken={pitch.deck.shareToken}
      isPublished={!!pitch.deck.publishedAt}
      imageUrls={imageUrls}
    />
  )
}
