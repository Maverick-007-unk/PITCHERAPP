'use client'
import { DeckEditor } from '@/components/editor/deck-editor'
import type { SlideData } from '@/lib/deck/types'

interface EditorClientProps {
  deckId: string
  pitchId: string
  initialSlides: SlideData
  shareToken: string
  isPublished: boolean
  imageUrls: Record<string, string>
}

export function EditorClient(props: EditorClientProps) {
  return <DeckEditor {...props} />
}
