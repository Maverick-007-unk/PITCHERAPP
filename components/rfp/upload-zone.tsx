'use client'
import { useState, useCallback } from 'react'

export function UploadZone({ onUpload }: { onUpload: (file: File) => Promise<void> }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    setLoading(true)
    await onUpload(file)
    setLoading(false)
  }, [onUpload])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 ${dragging ? 'border-ko-orange' : 'border-[#333]'} p-12 flex flex-col items-center gap-4 transition-colors`}
    >
      <p className="font-archivo text-4xl uppercase tracking-tight4 text-ko-white">
        Drop Your RFP
      </p>
      <p className="font-mono text-[10px] uppercase tracking-tight2 text-[#555]">
        PDF or DOCX — max 20MB
      </p>
      <label className="cursor-pointer">
        <input
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setLoading(true)
            await onUpload(file)
            setLoading(false)
          }}
        />
        <span className="font-mono text-[10px] uppercase tracking-tight2 border-2 border-[#444] text-ko-white px-4 py-2 hover:border-ko-orange transition-colors">
          {loading ? 'Uploading...' : 'Browse Files'}
        </span>
      </label>
    </div>
  )
}
