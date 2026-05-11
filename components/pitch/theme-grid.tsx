'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Theme {
  id: string
  name: string
  thumbnailUrl: string
  config: object
}

export function ThemeGrid({ themes, onSelect }: { themes: Theme[]; onSelect: (id: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-2 gap-4">
      {themes.map((theme) => (
        <button
          key={theme.id}
          onClick={() => { setSelected(theme.id); onSelect(theme.id) }}
          className={cn(
            'border-2 p-1 text-left transition-all',
            selected === theme.id ? 'border-ko-orange' : 'border-[#333] hover:border-[#555]'
          )}
        >
          <div className="aspect-video bg-[#111] relative mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={theme.thumbnailUrl} alt={theme.name} className="w-full h-full object-cover" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-white px-1 pb-1">{theme.name}</p>
        </button>
      ))}
    </div>
  )
}
