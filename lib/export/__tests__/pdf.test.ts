import { describe, test, expect, vi } from 'vitest'
import { generatePdf } from '../pdf'

const mockGoto = vi.fn()
const mockPdf = vi.fn(async () => Buffer.from('fake-pdf-bytes'))
const mockPage = { goto: mockGoto, pdf: mockPdf }
const mockNewPage = vi.fn(async () => mockPage)
const mockClose = vi.fn()
const mockBrowser = { newPage: mockNewPage, close: mockClose }

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(async () => mockBrowser),
  },
}))

describe('generatePdf', () => {
  test('returns a Buffer', async () => {
    const result = await generatePdf('http://localhost:3000/deck/tok-abc?print=1')
    expect(result).toBeInstanceOf(Buffer)
  })

  test('launches puppeteer and navigates to the given URL', async () => {
    const puppeteer = await import('puppeteer')
    const launchSpy = puppeteer.default.launch as ReturnType<typeof vi.fn>
    launchSpy.mockClear()
    mockGoto.mockClear()

    await generatePdf('http://localhost:3000/deck/tok-abc?print=1')

    expect(launchSpy).toHaveBeenCalled()
    const browser = await launchSpy.mock.results[0].value
    const page = await browser.newPage()
    expect(page.goto).toHaveBeenCalledWith(
      'http://localhost:3000/deck/tok-abc?print=1',
      expect.objectContaining({ waitUntil: 'networkidle0' })
    )
  })

  test('calls page.pdf with correct dimensions', async () => {
    const puppeteer = await import('puppeteer')
    const launchSpy = puppeteer.default.launch as ReturnType<typeof vi.fn>
    mockPdf.mockClear()
    await generatePdf('http://localhost:3000/deck/tok-abc?print=1')
    const browser = await launchSpy.mock.results[launchSpy.mock.results.length - 1].value
    const page = await browser.newPage()
    expect(page.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ width: '1920px', height: '1080px', printBackground: true })
    )
  })
})
