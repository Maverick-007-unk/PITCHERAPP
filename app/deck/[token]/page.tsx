import { notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { SlideView } from '@/components/deck/slide-view'
import type { PitchSections } from '@/lib/ai/generate-pitch'

export default async function PublicDeckPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const deck = await db.deck.findUnique({
    where: { shareToken: token },
    include: { pitch: { include: { theme: true } } },
  })

  if (!deck || !deck.publishedAt) notFound()

  const sections = deck.pitch.sections as PitchSections

  return (
    <div className="min-h-screen bg-ko-black">
      <div className="border-b-2 border-[#222] p-4 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange">// Pitcher</p>
        <p className="font-mono text-[10px] uppercase tracking-tight2 text-[#555]">Sponsorship Proposal</p>
      </div>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <SlideView sections={sections} themeName={deck.pitch.theme.name} />
      </div>
    </div>
  )
}
