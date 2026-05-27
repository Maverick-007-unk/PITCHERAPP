import PptxGenJS from 'pptxgenjs'
import type { SlideData } from '@/lib/deck/types'

const SLIDE_W = 13.33
const SLIDE_H = 7.5

export function pctToInches(pct: number, total: number): number {
  return Math.round((pct / 100) * total * 1000) / 1000
}

export async function generatePptx(
  slideData: SlideData,
  getImageBuffer: (storageKey: string) => Promise<Buffer>
): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'

  for (const slide of slideData) {
    const s = pptx.addSlide()
    s.background = { color: slide.background.replace('#', '') }

    const sorted = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex)
    for (const el of sorted) {
      const x = pctToInches(el.x, SLIDE_W)
      const y = pctToInches(el.y, SLIDE_H)
      const w = pctToInches(el.w, SLIDE_W)
      const h = pctToInches(el.h, SLIDE_H)

      if (el.type === 'text') {
        s.addText(el.content ?? '', {
          x, y, w, h,
          fontSize: el.fontSize ? Math.round(el.fontSize * 0.75) : 24,
          color: (el.color ?? '#FFFFFF').replace('#', ''),
          bold: (el.fontWeight ?? 400) >= 700,
          align: el.textAlign ?? 'left',
        })
      } else if (el.type === 'shape') {
        s.addShape('rect' as any, {
          x, y, w, h,
          fill: { color: (el.fill ?? '#222222').replace('#', '') },
          line: el.borderColor
            ? { color: el.borderColor.replace('#', ''), width: el.borderWidth ?? 1 }
            : { color: 'transparent', width: 0 },
        })
        // borderRadius not supported by pptxgenjs v4
      } else if (el.type === 'image' && el.storageKey) {
        try {
          const buf = await getImageBuffer(el.storageKey)
          s.addImage({
            data: `image/jpeg;base64,${buf.toString('base64')}`,
            x, y, w, h,
            ...(el.objectFit ? { sizing: { type: el.objectFit as 'cover' | 'contain', w, h } } : {}),
          })
        } catch {
          // Skip images that fail to fetch
        }
      }
    }
  }

  return pptx.write({ outputType: 'nodebuffer' }) as Promise<Buffer>
}
