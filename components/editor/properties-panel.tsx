'use client'
import type { SlideElement } from '@/lib/deck/types'

interface PropertiesPanelProps {
  element: SlideElement | null
  onUpdate: (changes: Partial<SlideElement>) => void
  onDelete: () => void
}

export function PropertiesPanel({ element, onUpdate, onDelete }: PropertiesPanelProps) {
  if (!element) {
    return (
      <div className="w-40 bg-[#0a0a0a] border-l-2 border-[#1a1a1a] flex flex-col p-3">
        <p className="font-mono text-[8px] uppercase tracking-tight2 text-ko-orange mb-4">// Properties</p>
        <p className="font-mono text-[8px] text-[#555]">No element selected</p>
      </div>
    )
  }

  return (
    <div className="w-40 bg-[#0a0a0a] border-l-2 border-[#1a1a1a] flex flex-col">
      <div className="p-2 border-b border-[#1a1a1a]">
        <p className="font-mono text-[8px] uppercase tracking-tight2 text-ko-orange">// Properties</p>
      </div>
      <div className="p-3 space-y-4 flex-1 overflow-y-auto">
        {element.type === 'text' && (
          <>
            <div>
              <label className="font-mono text-[7px] uppercase text-[#555] block mb-1">Font</label>
              <select
                className="w-full bg-[#111] border border-[#333] text-[#aaa] font-mono text-[8px] p-1"
                value={element.fontFamily ?? 'archivo-black'}
                onChange={(e) => onUpdate({ fontFamily: e.target.value as SlideElement['fontFamily'] })}
              >
                <option value="archivo-black">Archivo Black</option>
                <option value="space-mono">Space Mono</option>
                <option value="inter">Inter</option>
              </select>
            </div>
            <div>
              <label className="font-mono text-[7px] uppercase text-[#555] block mb-1">Size</label>
              <input
                type="number"
                className="w-full bg-[#111] border border-[#333] text-[#aaa] font-mono text-[8px] p-1"
                value={element.fontSize ?? 32}
                onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="font-mono text-[7px] uppercase text-[#555] block mb-1">Color</label>
              <input
                type="color"
                className="w-full h-7 cursor-pointer"
                value={element.color ?? '#FFFFFF'}
                onChange={(e) => onUpdate({ color: e.target.value })}
              />
            </div>
            <div>
              <label className="font-mono text-[7px] uppercase text-[#555] block mb-1">Transform</label>
              <div className="flex gap-1">
                <button
                  className={`font-mono text-[7px] px-2 py-1 ${element.textTransform === 'uppercase' ? 'bg-ko-orange text-black' : 'bg-[#111] border border-[#333] text-[#888]'}`}
                  onClick={() => onUpdate({ textTransform: 'uppercase' })}
                >
                  AA
                </button>
                <button
                  className={`font-mono text-[7px] px-2 py-1 ${element.textTransform !== 'uppercase' ? 'bg-ko-orange text-black' : 'bg-[#111] border border-[#333] text-[#888]'}`}
                  onClick={() => onUpdate({ textTransform: 'none' })}
                >
                  Aa
                </button>
              </div>
            </div>
          </>
        )}
        <div>
          <label className="font-mono text-[7px] uppercase text-[#555] block mb-2">Position</label>
          <div className="grid grid-cols-2 gap-1">
            {(['x', 'y', 'w', 'h'] as const).map((prop) => (
              <div key={prop}>
                <label className="font-mono text-[6px] text-[#444] block">{prop.toUpperCase()}</label>
                <input
                  type="number"
                  className="w-full bg-[#111] border border-[#333] text-[#aaa] font-mono text-[7px] p-1"
                  value={Math.round(element[prop])}
                  onChange={(e) => onUpdate({ [prop]: Number(e.target.value) })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="p-3 border-t border-[#1a1a1a]">
        <button
          aria-label="delete element"
          className="w-full border border-[#333] text-[#666] font-mono text-[7px] uppercase py-2 hover:border-red-800 hover:text-red-600"
          onClick={onDelete}
        >
          Delete Element
        </button>
      </div>
    </div>
  )
}
