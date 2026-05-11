import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { GenerationProgress } from '@/components/pitch/generation-progress'
import { PublishButton } from './publish-button'
import { SlideView } from '@/components/deck/slide-view'
import type { PitchSections } from '@/lib/ai/generate-pitch'

export default async function PitchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth()
  if (!orgId) redirect('/sign-in')

  const org = await db.org.findUnique({ where: { clerkOrgId: orgId } })
  if (!org) redirect('/sign-in')

  const { id } = await params
  const pitch = await db.pitch.findUnique({
    where: { id, orgId: org.id },
    include: { theme: true, deck: true },
  })
  if (!pitch) notFound()

  const sections = pitch.sections as PitchSections | null

  return (
    <div className="p-6">
      <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange mb-2">// Pitch Deck</p>
      <div className="flex items-end justify-between mb-8 border-b-2 border-[#222] pb-4">
        <h1 className="font-archivo text-5xl uppercase tracking-tight4 leading-brutalist">
          {pitch.theme.name}
        </h1>
        {pitch.deck && (
          <PublishButton
            shareToken={pitch.deck.shareToken}
            isPublished={!!pitch.deck.publishedAt}
          />
        )}
      </div>

      <GenerationProgress pitchId={pitch.id} initialStatus={pitch.status as 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'} />

      {sections && (
        <SlideView sections={sections as PitchSections} themeName={pitch.theme.name} />
      )}
    </div>
  )
}
