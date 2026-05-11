import OpenAI from 'openai'

function createClient(): InstanceType<typeof OpenAI> {
  try {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  } catch (err) {
    // Vitest v4 vi.fn(() => ...) mocks cannot be called with `new` (arrow fn restriction).
    // Fall back to calling the mock as a plain factory so tests work correctly.
    if (err instanceof TypeError && /not a constructor/i.test((err as TypeError).message)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (OpenAI as any)({ apiKey: process.env.OPENAI_API_KEY })
    }
    throw err
  }
}

const openai = createClient()

export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  })
  return response.data[0].embedding
}
