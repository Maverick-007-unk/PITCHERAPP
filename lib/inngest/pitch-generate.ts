import { inngest } from './client'

export const pitchGenerateFunction = inngest.createFunction(
  { id: 'pitch-generate', name: 'Generate Pitch', triggers: [{ event: 'pitch/generate' as const }] },
  async () => { return { status: 'stub' } }
)
