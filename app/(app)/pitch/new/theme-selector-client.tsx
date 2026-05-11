'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeGrid } from '@/components/pitch/theme-grid'
import { PillButton } from '@/components/ui/pill-button'

interface Theme {
  id: string
  name: string
  thumbnailUrl: string
  config: object
}

export function ThemeSelectorClient({ themes, rfpId }: { themes: Theme[]; rfpId: string }) {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleGenerate() {
    if (!selectedTheme || !rfpId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pitch/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfpId, themeId: selectedTheme }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Generation failed')
      }
      const { pitchId } = await res.json()
      router.push(`/pitch/${pitchId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <ThemeGrid themes={themes} onSelect={setSelectedTheme} />
      {error && <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange">{error}</p>}
      <PillButton onClick={handleGenerate} disabled={!selectedTheme || loading}>
        {loading ? 'Generating...' : 'Generate Pitch →'}
      </PillButton>
    </div>
  )
}
