import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { rfpParseFunction } from '@/lib/inngest/rfp-parse'
import { pitchGenerateFunction } from '@/lib/inngest/pitch-generate'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [rfpParseFunction, pitchGenerateFunction],
})
