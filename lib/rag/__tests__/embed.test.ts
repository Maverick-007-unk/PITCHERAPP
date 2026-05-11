import { describe, it, expect, vi } from 'vitest'

vi.mock('openai', () => ({
  default: vi.fn(function () {
    return {
      embeddings: {
        create: vi.fn().mockResolvedValue({ data: [{ embedding: Array(1536).fill(0.1) }] }),
      },
    }
  }),
}))

import { embedText } from '../embed'

it('returns a 1536-dimensional embedding vector', async () => {
  const vec = await embedText('some esports proposal text')
  expect(vec).toHaveLength(1536)
  expect(vec[0]).toBeTypeOf('number')
})
