import { IText, Rect, Image } from 'fabric'
import type { Canvas } from 'fabric'
import type { Slide, SlideElement } from './types'

function toPixels(pct: number, dimension: number): number {
  return (pct / 100) * dimension
}

function toPercent(pixels: number, dimension: number): number {
  return Math.round((pixels / dimension) * 10000) / 100
}

export async function loadSlide(
  canvas: Canvas,
  slide: Slide,
  getImageUrl: (storageKey: string) => Promise<string>
): Promise<void> {
  canvas.clear()
  ;(canvas as any).backgroundColor = slide.background

  const W = canvas.getWidth()
  const H = canvas.getHeight()

  const sorted = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex)

  for (const el of sorted) {
    const left = toPixels(el.x, W)
    const top = toPixels(el.y, H)
    const width = toPixels(el.w, W)
    const height = toPixels(el.h, H)

    if (el.type === 'text') {
      const obj = new IText(el.content ?? '', {
        left,
        top,
        width,
        fontSize: el.fontSize ?? 32,
        fontFamily: el.fontFamily ?? 'inter',
        fontWeight: el.fontWeight,
        fill: el.color ?? '#FFFFFF',
        textAlign: el.textAlign ?? 'left',
        lineHeight: el.lineHeight ?? 1.2,
        editable: true,
      } as any)
      ;(obj as any)._pid = el.id
      ;(obj as any)._pz = el.zIndex
      ;(obj as any)._ptransform = el.textTransform
      ;(obj as any)._poriginal = el.content
      canvas.add(obj)
    } else if (el.type === 'shape') {
      const obj = new Rect({
        left,
        top,
        width,
        height,
        fill: el.fill ?? '#222222',
        stroke: el.borderColor,
        strokeWidth: el.borderWidth ?? 0,
        rx: el.borderRadius ?? 0,
        ry: el.borderRadius ?? 0,
      } as any)
      ;(obj as any)._pid = el.id
      ;(obj as any)._pz = el.zIndex
      canvas.add(obj)
    } else if (el.type === 'image') {
      if (!el.storageKey) {
        console.warn(`[fabric-bridge] loadSlide: image element "${el.id}" has no storageKey — skipping`)
        continue
      }
      const url = await getImageUrl(el.storageKey)
      const img = await Image.fromURL(url, { crossOrigin: 'anonymous' } as any)
      const naturalW = (img as any).width ?? 1
      const naturalH = (img as any).height ?? 1
      ;(img as any).set({
        left,
        top,
        scaleX: width / naturalW,
        scaleY: height / naturalH,
      })
      ;(img as any)._pid = el.id
      ;(img as any)._pz = el.zIndex
      ;(img as any)._psk = el.storageKey
      ;(img as any)._pof = el.objectFit
      canvas.add(img as any)
    }
  }

  canvas.renderAll()
}

export function serializeCanvas(canvas: Canvas, existingSlide: Slide): Slide {
  const W = canvas.getWidth()
  const H = canvas.getHeight()
  const objects = canvas.getObjects() as any[]

  const elements: SlideElement[] = objects.map((obj: any, i: number) => {
    const id: string = obj._pid ?? crypto.randomUUID()
    const zIndex: number = obj._pz ?? i
    const x = toPercent(obj.left ?? 0, W)
    const y = toPercent(obj.top ?? 0, H)
    const w = toPercent((obj.width ?? 100) * (obj.scaleX ?? 1), W)
    const h = toPercent((obj.height ?? 100) * (obj.scaleY ?? 1), H)

    if (obj.type === 'i-text' || obj.type === 'text') {
      return {
        id, type: 'text', x, y, w, h, zIndex,
        content: obj.text ?? obj._poriginal ?? '',
        fontSize: obj.fontSize,
        fontFamily: obj.fontFamily,
        fontWeight: obj.fontWeight,
        color: obj.fill,
        textTransform: obj._ptransform,
        textAlign: obj.textAlign,
        lineHeight: obj.lineHeight,
      }
    } else if (obj.type === 'rect') {
      return {
        id, type: 'shape', x, y, w, h, zIndex,
        fill: obj.fill,
        borderColor: obj.stroke,
        borderWidth: obj.strokeWidth,
        borderRadius: obj.rx,
      }
    } else {
      return {
        id, type: 'image', x, y, w, h, zIndex,
        storageKey: obj._psk,
        objectFit: obj._pof,
      }
    }
  })

  return { ...existingSlide, elements }
}
