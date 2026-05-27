import { describe, test, expect, vi, beforeEach } from 'vitest'
import { generatePptx, pctToInches } from '../pptx'
import type { SlideData } from '@/lib/deck/types'

const mockAddText = vi.fn()
const mockAddShape = vi.fn()
const mockAddImage = vi.fn()
const mockWrite = vi.fn(async () => Buffer.from('fake-pptx-binary'))
const mockAddSlide = vi.fn(() => ({
  addText: mockAddText,
  addShape: mockAddShape,
  addImage: mockAddImage,
  background: null,
}))

vi.mock('pptxgenjs', () => {
  const MockPptx = vi.fn(function (this: any) {
    this.layout = ''
    this.addSlide = mockAddSlide
    this.write = mockWrite
  })
  return { default: MockPptx }
})

const testSlideData: SlideData = [
  {
    id: 'slide-1',
    label: 'Executive Summary',
    background: '#000000',
    elements: [
      {
        id: 'el-1', type: 'text',
        x: 5, y: 5, w: 90, h: 20, zIndex: 1,
        content: 'Test heading', fontSize: 48,
        color: '#FFFFFF', textAlign: 'left',
      },
      {
        id: 'el-2', type: 'shape',
        x: 0, y: 0, w: 100, h: 5, zIndex: 0,
        fill: '#FF4D00',
      },
    ],
  },
]

describe('pctToInches', () => {
  test('converts 5% of 13.33 inches to ~0.67', () => {
    expect(pctToInches(5, 13.33)).toBeCloseTo(0.67, 1)
  })

  test('converts 100% to full dimension', () => {
    expect(pctToInches(100, 13.33)).toBeCloseTo(13.33, 1)
  })
})

describe('generatePptx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWrite.mockResolvedValue(Buffer.from('fake-pptx-binary'))
    mockAddSlide.mockReturnValue({ addText: mockAddText, addShape: mockAddShape, addImage: mockAddImage, background: null })
  })

  test('returns a Buffer', async () => {
    const result = await generatePptx(testSlideData, vi.fn())
    expect(result).toBeInstanceOf(Buffer)
  })

  test('calls addSlide once per slide', async () => {
    await generatePptx(testSlideData, vi.fn())
    expect(mockAddSlide).toHaveBeenCalledTimes(1)
  })

  test('calls addText for text elements', async () => {
    await generatePptx(testSlideData, vi.fn())
    expect(mockAddText).toHaveBeenCalledWith(
      'Test heading',
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
    )
  })

  test('calls addShape for shape elements', async () => {
    await generatePptx(testSlideData, vi.fn())
    expect(mockAddShape).toHaveBeenCalled()
  })

  test('converts x percentage to correct inches for text element', async () => {
    await generatePptx(testSlideData, vi.fn())
    // el-1: x=5%, 5/100 * 13.33 = 0.6665
    const call = mockAddText.mock.calls[0]
    expect(call[1].x).toBeCloseTo(0.67, 1)
  })
})
