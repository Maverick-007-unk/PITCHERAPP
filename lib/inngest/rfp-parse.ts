import { inngest } from './client'
import { db } from '@/lib/db/client'
import { r2 } from '@/lib/storage/r2'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { extractText } from '@/lib/parser/extract-text'
import { extractRfpData } from '@/lib/ai/extract-rfp'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const rfpParseFunction = inngest.createFunction(
  { id: 'rfp-parse', name: 'Parse RFP Document', triggers: [{ event: 'rfp/parse' as const }] },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: any) => {
    const { rfpId, storageKey, fileType } = event.data as {
      rfpId: string
      storageKey: string
      fileType: string
    }

    await step.run('update-status-running', async () => {
      await db.rFP.update({ where: { id: rfpId }, data: { status: 'RUNNING' } })
    })

    const text = await step.run('download-and-extract-text', async () => {
      const obj = await r2.send(new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: storageKey,
      }))
      const chunks: Uint8Array[] = []
      for await (const chunk of obj.Body as AsyncIterable<Uint8Array>) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)
      return extractText(buffer, fileType)
    })

    const extractedJson = await step.run('claude-extract', async () => {
      return extractRfpData(text)
    })

    await step.run('save-and-complete', async () => {
      await db.rFP.update({
        where: { id: rfpId },
        data: { status: 'DONE', extractedJson: extractedJson as object },
      })
    })
  }
)
