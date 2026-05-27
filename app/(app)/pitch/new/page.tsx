import { db } from '@/lib/db/client'
import { ThemeSelectorClient } from './theme-selector-client'

export default async function NewPitchPage({ searchParams }: { searchParams: Promise<{ rfpId?: string }> }) {
  const { rfpId } = await searchParams
  const themes = await db.theme.findMany()

  return (
    <div className="p-6">
      <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange mb-2">// Step 2 of 2</p>
      <h1 className="font-archivo text-6xl uppercase tracking-tight4 leading-brutalist mb-8">
        Pick Your<br/>Theme
      </h1>
      <ThemeSelectorClient themes={themes as { id: string; name: string; thumbnailUrl: string; config: object }[]} rfpId={rfpId ?? ''} />
    </div>
  )
}
