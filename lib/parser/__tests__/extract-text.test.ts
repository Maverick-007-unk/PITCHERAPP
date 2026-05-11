import { describe, it, expect, vi } from 'vitest'

vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({ text: 'Extracted PDF text' }),
}))
vi.mock('mammoth', () => ({
  extractRawText: vi.fn().mockResolvedValue({ value: 'Extracted DOCX text' }),
}))

import { extractText } from '../extract-text'

describe('extractText', () => {
  it('extracts text from PDF', async () => {
    const buf = Buffer.from('fake-pdf')
    const text = await extractText(buf, 'application/pdf')
    expect(text).toBe('Extracted PDF text')
  })

  it('extracts text from DOCX', async () => {
    const buf = Buffer.from('fake-docx')
    const text = await extractText(buf, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    expect(text).toBe('Extracted DOCX text')
  })

  it('throws for unsupported type', async () => {
    await expect(extractText(Buffer.from(''), 'text/plain')).rejects.toThrow('Unsupported')
  })
})
