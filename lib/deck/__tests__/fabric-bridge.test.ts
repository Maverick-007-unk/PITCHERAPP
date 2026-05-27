import { describe, test, expect, vi, beforeEach } from 'vitest'
import { loadSlide, serializeCanvas } from '../fabric-bridge'
import type { Slide } from '../types'

vi.mock('fabric', () => ({
  IText: vi.fn(function (this: any, text: string, opts: any = {}) {
    this.type = 'i-text'
    this.text = text
    this.left = opts.left ?? 0
    this.top = opts.top ?? 0
    this.width = opts.width ?? 100
    this.scaleX = 1
    this.scaleY = 1
    this.fontSize = opts.fontSize
    this.fontFamily = opts.fontFamily
    this.fill = opts.fill
    this.textAlign = opts.textAlign
    this.lineHeight = opts.lineHeight
  }),
  Rect: vi.fn(function (this: any, opts: any = {}) {
    this.type = 'rect'
    this.left = opts.left ?? 0
    this.top = opts.top ?? 0
    this.width = opts.width ?? 100
    this.height = opts.height ?? 100
    this.scaleX = 1
    this.scaleY = 1
    this.fill = opts.fill
    this.stroke = opts.stroke
    this.strokeWidth = opts.strokeWidth
    this.rx = opts.rx
  }),
  Image: {
    fromURL: vi.fn(async (_url: string) => ({
      type: 'image',
      left: 0, top: 0, width: 200, height: 150,
      scaleX: 1, scaleY: 1,
      set: vi.fn(function (this: any, props: any) { Object.assign(this, props) }),
    })),
  },
}))

function makeMockCanvas() {
  const objects: any[] = []
  return {
    objects,
    backgroundColor: '' as string,
    clear: vi.fn(() => { objects.length = 0 }),
    add: vi.fn((obj: any) => objects.push(obj)),
    getObjects: vi.fn(() => [...objects]),
    renderAll: vi.fn(),
    getWidth: vi.fn(() => 1920),
    getHeight: vi.fn(() => 1080),
  }
}

describe('loadSlide', () => {
  beforeEach(() => vi.clearAllMocks())

  test('calls canvas.clear() before adding elements', async () => {
    const canvas = makeMockCanvas()
    const slide: Slide = { id: 's1', label: 'Test', background: '#000000', elements: [] }
    await loadSlide(canvas as any, slide, vi.fn())
    expect(canvas.clear).toHaveBeenCalled()
  })

  test('sets the slide background color', async () => {
    const canvas = makeMockCanvas()
    const slide: Slide = { id: 's1', label: 'Test', background: '#FF4D00', elements: [] }
    await loadSlide(canvas as any, slide, vi.fn())
    expect(canvas.backgroundColor).toBe('#FF4D00')
  })

  test('adds one IText object for a text element', async () => {
    const canvas = makeMockCanvas()
    const slide: Slide = {
      id: 's1', label: 'Test', background: '#000000',
      elements: [{
        id: 'e1', type: 'text', x: 5, y: 5, w: 90, h: 20, zIndex: 1,
        content: 'Hello World', fontSize: 48, color: '#FFFFFF',
      }],
    }
    await loadSlide(canvas as any, slide, vi.fn())
    expect(canvas.add).toHaveBeenCalledTimes(1)
    expect(canvas.objects[0].text).toBe('Hello World')
    expect(canvas.objects[0].type).toBe('i-text')
  })

  test('converts percentage x/y to pixel coordinates for text', async () => {
    const canvas = makeMockCanvas()
    const slide: Slide = {
      id: 's1', label: 'Test', background: '#000000',
      elements: [{ id: 'e1', type: 'text', x: 10, y: 20, w: 80, h: 30, zIndex: 1, content: 'Hi' }],
    }
    await loadSlide(canvas as any, slide, vi.fn())
    // 10% of 1920 = 192, 20% of 1080 = 216
    expect(canvas.objects[0].left).toBeCloseTo(192, 0)
    expect(canvas.objects[0].top).toBeCloseTo(216, 0)
  })

  test('calls getImageUrl for image elements', async () => {
    const canvas = makeMockCanvas()
    const getImageUrl = vi.fn().mockResolvedValue('https://cdn.example.com/img.png')
    const slide: Slide = {
      id: 's1', label: 'Test', background: '#000000',
      elements: [{ id: 'e1', type: 'image', x: 0, y: 0, w: 50, h: 50, zIndex: 1, storageKey: 'deck/abc.png' }],
    }
    await loadSlide(canvas as any, slide, getImageUrl)
    expect(getImageUrl).toHaveBeenCalledWith('deck/abc.png')
  })

  test('adds a Rect object for shape elements', async () => {
    const canvas = makeMockCanvas()
    const slide: Slide = {
      id: 's1', label: 'Test', background: '#000000',
      elements: [{ id: 'e1', type: 'shape', x: 5, y: 5, w: 20, h: 10, zIndex: 1, fill: '#FF4D00' }],
    }
    await loadSlide(canvas as any, slide, vi.fn())
    expect(canvas.objects[0].type).toBe('rect')
    expect(canvas.objects[0].fill).toBe('#FF4D00')
  })

  test('scales image using scaleX/scaleY based on natural dimensions', async () => {
    const canvas = makeMockCanvas()
    // element is 50%×50% on a 1920×1080 canvas → pixel 960×540
    // mock image natural size: 200×150 → scaleX=960/200=4.8, scaleY=540/150=3.6
    const slide: Slide = {
      id: 's1', label: 'Test', background: '#000',
      elements: [{ id: 'e1', type: 'image', x: 0, y: 0, w: 50, h: 50, zIndex: 1, storageKey: 'deck/abc.png' }],
    }
    const getImageUrl = vi.fn().mockResolvedValue('https://cdn.example.com/img.png')
    await loadSlide(canvas as any, slide, getImageUrl)
    const img = canvas.objects[0]
    expect(img.scaleX).toBeCloseTo(4.8, 5)
    expect(img.scaleY).toBeCloseTo(3.6, 5)
  })

  test('skips image elements with no storageKey', async () => {
    const canvas = makeMockCanvas()
    const slide: Slide = {
      id: 's1', label: 'Test', background: '#000',
      elements: [{ id: 'e1', type: 'image', x: 0, y: 0, w: 50, h: 50, zIndex: 1 }], // no storageKey
    }
    await loadSlide(canvas as any, slide, vi.fn())
    expect(canvas.add).not.toHaveBeenCalled()
  })
})

describe('serializeCanvas', () => {
  test('converts pixel left/top to percentage coordinates', () => {
    const canvas = makeMockCanvas()
    canvas.objects.push({
      type: 'i-text', text: 'Test',
      left: 192,   // 10% of 1920
      top: 216,    // 20% of 1080
      width: 1536, // 80% of 1920
      scaleX: 1, scaleY: 1,
      _pid: 'e1', _pz: 1, _poriginal: 'Test',
    })
    const existingSlide: Slide = { id: 's1', label: 'Test', background: '#000000', elements: [] }
    const result = serializeCanvas(canvas as any, existingSlide)
    expect(result.elements[0].x).toBeCloseTo(10, 0)
    expect(result.elements[0].y).toBeCloseTo(20, 0)
    expect(result.elements[0].w).toBeCloseTo(80, 0)
  })

  test('preserves slide id and label', () => {
    const canvas = makeMockCanvas()
    const existingSlide: Slide = { id: 'my-slide', label: 'My Label', background: '#000', elements: [] }
    const result = serializeCanvas(canvas as any, existingSlide)
    expect(result.id).toBe('my-slide')
    expect(result.label).toBe('My Label')
  })

  test('extracts text content from IText objects', () => {
    const canvas = makeMockCanvas()
    canvas.objects.push({
      type: 'i-text', text: 'Modified text',
      left: 96, top: 54, width: 1728, scaleX: 1, scaleY: 1,
      fill: '#FFFFFF', fontSize: 48, fontFamily: 'archivo-black',
      _pid: 'e1', _pz: 1, _poriginal: 'Modified text',
    })
    const existingSlide: Slide = { id: 's1', label: 'Test', background: '#000', elements: [] }
    const result = serializeCanvas(canvas as any, existingSlide)
    expect(result.elements[0].content).toBe('Modified text')
    expect(result.elements[0].type).toBe('text')
  })

  test('prefers live obj.text over _poriginal so edits are not discarded', () => {
    const canvas = makeMockCanvas()
    canvas.objects.push({
      type: 'i-text', text: 'Edited by user',
      left: 96, top: 54, width: 1728, scaleX: 1, scaleY: 1,
      fill: '#FFFFFF', fontSize: 48, fontFamily: 'archivo-black',
      _pid: 'e1', _pz: 1, _poriginal: 'Original text',
    })
    const existingSlide: Slide = { id: 's1', label: 'Test', background: '#000', elements: [] }
    const result = serializeCanvas(canvas as any, existingSlide)
    expect(result.elements[0].content).toBe('Edited by user')
  })

  test('returns empty elements for empty canvas', () => {
    const canvas = makeMockCanvas()
    const existingSlide: Slide = { id: 's1', label: 'Test', background: '#000', elements: [] }
    const result = serializeCanvas(canvas as any, existingSlide)
    expect(result.elements).toHaveLength(0)
  })

  test('round-trips fontWeight on text elements', () => {
    const canvas = makeMockCanvas()
    canvas.objects.push({
      type: 'i-text', text: 'Bold',
      left: 96, top: 54, width: 1728, scaleX: 1, scaleY: 1,
      fill: '#FFFFFF', fontSize: 48, fontFamily: 'inter', fontWeight: 700,
      _pid: 'e1', _pz: 1, _poriginal: 'Bold',
    })
    const existingSlide: Slide = { id: 's1', label: 'Test', background: '#000', elements: [] }
    const result = serializeCanvas(canvas as any, existingSlide)
    expect(result.elements[0].fontWeight).toBe(700)
  })
})

describe('loadSlide — zIndex ordering', () => {
  beforeEach(() => vi.clearAllMocks())

  test('adds elements in ascending zIndex order regardless of array order', async () => {
    const canvas = makeMockCanvas()
    const slide: Slide = {
      id: 's1', label: 'Test', background: '#000000',
      elements: [
        { id: 'e2', type: 'text', x: 0, y: 0, w: 50, h: 10, zIndex: 2, content: 'Second' },
        { id: 'e1', type: 'text', x: 0, y: 50, w: 50, h: 10, zIndex: 1, content: 'First' },
      ],
    }
    await loadSlide(canvas as any, slide, vi.fn())
    // canvas.objects[0] must be zIndex:1 ("First"), objects[1] must be zIndex:2 ("Second")
    expect(canvas.objects[0].text).toBe('First')
    expect(canvas.objects[1].text).toBe('Second')
  })
})
