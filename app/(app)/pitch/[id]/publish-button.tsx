'use client'
import { useState } from 'react'
import { PillButton } from '@/components/ui/pill-button'

export function PublishButton({
  shareToken,
  isPublished,
}: {
  shareToken: string
  isPublished: boolean
}) {
  const [published, setPublished] = useState(isPublished)

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/deck/${shareToken}`
    : `/deck/${shareToken}`

  async function handlePublish() {
    await fetch(`/api/deck/${shareToken}`, { method: 'POST' })
    setPublished(true)
  }

  if (published) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-mono text-[9px] uppercase tracking-tight2 text-ko-orange border border-ko-orange px-2 py-0.5">Live</span>
        <button
          onClick={() => navigator.clipboard.writeText(shareUrl)}
          className="font-mono text-[9px] uppercase tracking-tight2 text-[#555] hover:text-ko-white transition-colors"
        >
          Copy Link
        </button>
      </div>
    )
  }

  return <PillButton onClick={handlePublish}>Publish & Share →</PillButton>
}
