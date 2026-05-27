'use client'

type Tool = 'select' | 'text' | 'shape' | 'image'

interface EditorToolbarProps {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  saveStatus: 'saved' | 'saving' | 'error'
  onPublish: () => void
  isPublished: boolean
  pitchId: string
}

const STATUS_LABEL = {
  saved: 'SAVED',
  saving: 'SAVING...',
  error: 'SAVE FAILED',
}

export function EditorToolbar({
  activeTool, onToolChange, onUndo, onRedo, canUndo, canRedo,
  saveStatus, onPublish, isPublished,
}: EditorToolbarProps) {
  return (
    <div className="h-10 bg-[#0a0a0a] border-b-2 border-[#1a1a1a] flex items-center gap-1 px-3">
      {(['text', 'shape', 'image'] as Tool[]).map((tool) => (
        <button
          key={tool}
          aria-label={tool}
          onClick={() => onToolChange(tool)}
          className={`font-mono text-[8px] uppercase px-2 py-1 ${
            activeTool === tool
              ? 'bg-ko-orange text-black'
              : 'bg-[#1a1a1a] border border-[#333] text-[#888]'
          }`}
        >
          {tool}
        </button>
      ))}
      <div className="w-px h-5 bg-[#222] mx-1" />
      <button
        aria-label="undo"
        onClick={onUndo}
        disabled={!canUndo}
        className="font-mono text-[8px] uppercase px-2 py-1 bg-[#1a1a1a] border border-[#333] text-[#888] disabled:opacity-30"
      >
        ↩ UNDO
      </button>
      <button
        aria-label="redo"
        onClick={onRedo}
        disabled={!canRedo}
        className="font-mono text-[8px] uppercase px-2 py-1 bg-[#1a1a1a] border border-[#333] text-[#888] disabled:opacity-30"
      >
        ↪ REDO
      </button>
      <div className="flex-1" />
      <span
        className={`font-mono text-[7px] mr-3 ${
          saveStatus === 'error' ? 'text-red-500' : 'text-[#555]'
        }`}
      >
        {STATUS_LABEL[saveStatus]}
      </span>
      <button
        aria-label="publish"
        onClick={onPublish}
        className="font-mono text-[8px] uppercase px-3 py-1 bg-ko-orange text-black"
      >
        {isPublished ? 'PUBLISHED ✓' : 'PUBLISH →'}
      </button>
    </div>
  )
}
