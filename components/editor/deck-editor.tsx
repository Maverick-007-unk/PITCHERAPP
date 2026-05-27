'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { SlideData, Slide, SlideElement } from '@/lib/deck/types'
import { EditorToolbar } from './editor-toolbar'
import { SlidePanel } from './slide-panel'
import { PropertiesPanel } from './properties-panel'
import type { CanvasAreaRef } from './canvas-area'

const CanvasArea = dynamic(
  () => import('./canvas-area').then((m) => m.CanvasArea),
  { ssr: false }
) as any

type Tool = 'select' | 'text' | 'shape' | 'image'
type SaveStatus = 'saved' | 'saving' | 'error'

interface DeckEditorProps {
  deckId: string
  pitchId: string
  initialSlides: SlideData
  shareToken: string
  isPublished: boolean
  imageUrls: Record<string, string>
}

export function DeckEditor({
  deckId, pitchId, initialSlides, shareToken, isPublished: initialIsPublished, imageUrls: initialImageUrls,
}: DeckEditorProps) {
  const [slides, setSlides] = useState<SlideData>(initialSlides)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [isPublished, setIsPublished] = useState(initialIsPublished)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>(initialImageUrls)

  const canvasRef = useRef<CanvasAreaRef>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const historyRef = useRef<SlideData[]>([JSON.parse(JSON.stringify(initialSlides))])

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
  }, [])
  const historyIndexRef = useRef(0)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const pushHistory = useCallback((newSlides: SlideData) => {
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1)
    const next = [...trimmed, JSON.parse(JSON.stringify(newSlides))].slice(-50)
    historyRef.current = next
    historyIndexRef.current = next.length - 1
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(false)
  }, [])

  const scheduleSave = useCallback((newSlides: SlideData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/deck/${deckId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slideData: newSlides }),
        })
        if (!res.ok) throw new Error('Save failed')
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 1000)
  }, [deckId])

  const updateSlides = useCallback((newSlides: SlideData) => {
    setSlides(newSlides)
    pushHistory(newSlides)
    scheduleSave(newSlides)
  }, [pushHistory, scheduleSave])

  const handleSlideChange = useCallback((updatedSlide: Slide) => {
    const next = slides.map((s) => (s.id === updatedSlide.id ? updatedSlide : s))
    updateSlides(next)
  }, [slides, updateSlides])

  const handleElementUpdate = useCallback((changes: Partial<SlideElement>) => {
    if (!selectedElementId) return
    canvasRef.current?.updateElement(selectedElementId, changes)
    const next = slides.map((slide, i) => {
      if (i !== currentIndex) return slide
      return {
        ...slide,
        elements: slide.elements.map((el) =>
          el.id === selectedElementId ? { ...el, ...changes } : el
        ),
      }
    })
    updateSlides(next)
  }, [selectedElementId, currentIndex, slides, updateSlides])

  const handleElementDelete = useCallback(() => {
    if (!selectedElementId) return
    const next = slides.map((slide, i) => {
      if (i !== currentIndex) return slide
      return { ...slide, elements: slide.elements.filter((el) => el.id !== selectedElementId) }
    })
    updateSlides(next)
    setSelectedElementId(null)
  }, [selectedElementId, currentIndex, slides, updateSlides])

  const handleAddSlide = useCallback(() => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      label: `Slide ${slides.length + 1}`,
      background: slides[0]?.background ?? '#000000',
      elements: [],
    }
    updateSlides([...slides, newSlide])
    setCurrentIndex(slides.length)
  }, [slides, updateSlides])

  const handleDeleteSlide = useCallback((index: number) => {
    if (slides.length <= 1) return
    const next = slides.filter((_, i) => i !== index)
    updateSlides(next)
    setCurrentIndex((prev) => Math.min(prev, next.length - 1))
  }, [slides, updateSlides])

  const handleToolChange = useCallback((tool: Tool) => {
    setActiveTool(tool)
    if (tool === 'text') canvasRef.current?.addTextElement()
    if (tool === 'shape') canvasRef.current?.addShapeElement()
    if (tool === 'image') canvasRef.current?.triggerImageUpload()
  }, [])

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current--
    const snapshot = historyRef.current[historyIndexRef.current]
    setSlides(snapshot)
    scheduleSave(snapshot)
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(true)
  }, [scheduleSave])

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current++
    const snapshot = historyRef.current[historyIndexRef.current]
    setSlides(snapshot)
    scheduleSave(snapshot)
    setCanUndo(true)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [scheduleSave])

  const handlePublish = useCallback(async () => {
    try {
      const res = await fetch(`/api/pitch/${pitchId}/publish`, { method: 'POST' })
      if (res.ok) setIsPublished(true)
    } catch { /* silent */ }
  }, [pitchId])

  const selectedElement =
    selectedElementId != null
      ? slides[currentIndex]?.elements.find((e) => e.id === selectedElementId) ?? null
      : null

  return (
    <div className="flex flex-col h-screen bg-ko-black">
      <EditorToolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        saveStatus={saveStatus}
        onPublish={handlePublish}
        isPublished={isPublished}
        pitchId={pitchId}
      />
      <div className="flex flex-1 overflow-hidden">
        <SlidePanel
          slides={slides}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
          onReorder={updateSlides}
          onAdd={handleAddSlide}
          onDelete={handleDeleteSlide}
        />
        <CanvasArea
          ref={canvasRef}
          slide={slides[currentIndex]}
          imageUrls={imageUrls}
          deckId={deckId}
          onSlideChange={handleSlideChange}
          onSelectionChange={setSelectedElementId}
          onImageUploaded={(storageKey: string, url: string) =>
            setImageUrls((prev) => ({ ...prev, [storageKey]: url }))
          }
        />
        <PropertiesPanel
          element={selectedElement}
          onUpdate={handleElementUpdate}
          onDelete={handleElementDelete}
        />
      </div>
    </div>
  )
}
