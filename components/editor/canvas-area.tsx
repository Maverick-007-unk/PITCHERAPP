'use client'
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import type { Canvas } from 'fabric'
import type { Slide, SlideElement } from '@/lib/deck/types'
import { loadSlide, serializeCanvas } from '@/lib/deck/fabric-bridge'

export interface CanvasAreaRef {
  updateElement: (id: string, changes: Partial<SlideElement>) => void
  addTextElement: () => void
  addShapeElement: () => void
  triggerImageUpload: () => void
}

interface CanvasAreaProps {
  slide: Slide
  imageUrls: Record<string, string>
  deckId: string
  onSlideChange: (slide: Slide) => void
  onSelectionChange: (elementId: string | null) => void
  onImageUploaded: (storageKey: string, url: string) => void
}

function toPixels(pct: number, dimension: number): number {
  return (pct / 100) * dimension
}

export const CanvasArea = forwardRef<CanvasAreaRef, CanvasAreaProps>(function CanvasArea(
  { slide, imageUrls, deckId, onSlideChange, onSelectionChange, onImageUploaded },
  ref
) {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const currentSlideIdRef = useRef(slide.id)
  const slideRef = useRef(slide)
  slideRef.current = slide
  const imageUrlsRef = useRef(imageUrls)
  imageUrlsRef.current = imageUrls
  const fileInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    updateElement(id: string, changes: Partial<SlideElement>) {
      const fc = fabricRef.current
      if (!fc) return
      const obj = (fc.getObjects() as any[]).find((o) => o._pid === id)
      if (!obj) return
      if (changes.content !== undefined) obj.set('text', changes.content)
      if (changes.fontSize !== undefined) obj.set('fontSize', changes.fontSize)
      if (changes.fontFamily !== undefined) obj.set('fontFamily', changes.fontFamily)
      if (changes.color !== undefined) obj.set('fill', changes.color)
      if (changes.x !== undefined) obj.set('left', toPixels(changes.x, fc.getWidth()))
      if (changes.y !== undefined) obj.set('top', toPixels(changes.y, fc.getHeight()))
      if (changes.w !== undefined) obj.set('width', toPixels(changes.w, fc.getWidth()))
      if (changes.h !== undefined) obj.set('height', toPixels(changes.h, fc.getHeight()))
      fc.renderAll()
    },
    addTextElement() {
      const fc = fabricRef.current
      if (!fc) return
      import('fabric').then(({ IText }) => {
        const obj = new IText('New Text', {
          left: fc.getWidth() * 0.1,
          top: fc.getHeight() * 0.4,
          width: fc.getWidth() * 0.8,
          fontSize: 48,
          fill: '#FFFFFF',
          fontFamily: 'Archivo Black',
          editable: true,
        } as any)
        ;(obj as any)._pid = crypto.randomUUID()
        ;(obj as any)._pz = fc.getObjects().length
        fc.add(obj)
        fc.setActiveObject(obj)
        fc.renderAll()
        onSlideChange(serializeCanvas(fc, slideRef.current))
      })
    },
    addShapeElement() {
      const fc = fabricRef.current
      if (!fc) return
      import('fabric').then(({ Rect }) => {
        const obj = new Rect({
          left: fc.getWidth() * 0.1,
          top: fc.getHeight() * 0.1,
          width: fc.getWidth() * 0.2,
          height: fc.getHeight() * 0.2,
          fill: '#FF4D00',
        } as any)
        ;(obj as any)._pid = crypto.randomUUID()
        ;(obj as any)._pz = fc.getObjects().length
        fc.add(obj)
        fc.setActiveObject(obj)
        fc.renderAll()
        onSlideChange(serializeCanvas(fc, slideRef.current))
      })
    },
    triggerImageUpload() {
      fileInputRef.current?.click()
    },
  }))

  useEffect(() => {
    if (!canvasElRef.current) return
    let disposed = false

    import('fabric').then(({ Canvas }) => {
      if (disposed || !canvasElRef.current) return
      const container = canvasElRef.current.parentElement!
      const w = container.clientWidth
      const h = Math.round(w * (9 / 16))
      const fc = new Canvas(canvasElRef.current, { width: w, height: h })
      fabricRef.current = fc

      loadSlide(fc, slideRef.current, (k) =>
        Promise.resolve(imageUrlsRef.current[k] ?? '')
      )

      fc.on('object:modified', () => {
        if (fabricRef.current) onSlideChange(serializeCanvas(fabricRef.current, slideRef.current))
      })
      fc.on('text:changed', () => {
        if (fabricRef.current) onSlideChange(serializeCanvas(fabricRef.current, slideRef.current))
      })
      fc.on('selection:created', () => {
        const obj = (fabricRef.current as any)?.getActiveObject()
        onSelectionChange((obj as any)?._pid ?? null)
      })
      fc.on('selection:cleared', () => onSelectionChange(null))
    })

    return () => {
      disposed = true
      fabricRef.current?.dispose()
      fabricRef.current = null
    }
  }, [])

  useEffect(() => {
    if (currentSlideIdRef.current === slide.id) return
    currentSlideIdRef.current = slide.id
    if (fabricRef.current) {
      loadSlide(fabricRef.current, slide, (k) =>
        Promise.resolve(imageUrlsRef.current[k] ?? '')
      )
    }
  }, [slide.id])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/deck/${deckId}/upload-image`, { method: 'POST', body: formData })
    if (!res.ok) return
    const { storageKey, url } = await res.json()
    onImageUploaded(storageKey, url)

    const fc = fabricRef.current
    if (!fc) return
    import('fabric').then(({ Image }) => {
      Image.fromURL(url, { crossOrigin: 'anonymous' } as any).then((img: any) => {
        img.set({ left: fc.getWidth() * 0.1, top: fc.getHeight() * 0.1, width: fc.getWidth() * 0.4, height: fc.getHeight() * 0.4 })
        ;(img as any)._pid = crypto.randomUUID()
        ;(img as any)._pz = fc.getObjects().length
        ;(img as any)._psk = storageKey
        fc.add(img)
        fc.renderAll()
        onSlideChange(serializeCanvas(fc, slideRef.current))
      })
    })
    e.target.value = ''
  }

  return (
    <div className="flex-1 bg-[#0d0d0d] flex items-center justify-center p-5">
      <div className="w-full max-w-[900px]" style={{ aspectRatio: '16/9' }}>
        <canvas ref={canvasElRef} />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
})
