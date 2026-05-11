import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { GenerationProgress } from '@/components/pitch/generation-progress'
import { PublishButton } from './publish-button'

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

  const sections = pitch.sections as Record<string, string> | null

  const SECTION_LABELS: Record<string, string> = {
    executiveSummary: 'Executive Summary',
    whyUs: 'Why Us',
    audienceReach: 'Audience',
    deliverables: 'What You Get',
    pricing: 'Investment',
    timeline: 'Timeline',
    cta: "Let's Talk",
  }

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
        <div className="space-y-1">
          {Object.entries(sections).map(([key, value]) => (
            <div
              key={key}
              className="min-h-[320px] border border-[#222] p-12 flex flex-col justify-between"
            >
              <p className="font-mono text-[9px] uppercase tracking-tight2 text-ko-orange">
                // {SECTION_LABELS[key] ?? key}
              </p>
              <p className="font-archivo text-4xl uppercase tracking-tight4 leading-brutalist text-ko-white max-w-3xl">
                {value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
