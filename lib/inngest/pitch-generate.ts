import { inngest } from './client'
import { db } from '@/lib/db/client'
import { retrieveSimilarProposals } from '@/lib/rag/retrieve'
import type { ProposalChunk } from '@/lib/rag/retrieve'
import { generatePitchSections } from '@/lib/ai/generate-pitch'
import type { RfpData } from '@/lib/ai/extract-rfp'

export const pitchGenerateFunction = inngest.createFunction(
  { id: 'pitch-generate', name: 'Generate Pitch Sections', triggers: [{ event: 'pitch/generate' }] },
  async ({ event, step }: { event: any; step: any }) => {
    const { pitchId, orgClerkId } = event.data

    await step.run('mark-running', async () => {
      await db.pitch.update({ where: { id: pitchId }, data: { status: 'RUNNING' } })
    })

    const pitch = await step.run('load-pitch', async () => {
      return db.pitch.findUniqueOrThrow({
        where: { id: pitchId },
        include: { rfp: true },
      })
    })

    const rfpData = pitch.rfp.extractedJson as RfpData

    const similarProposals = await step.run('retrieve-proposals', async () => {
      return retrieveSimilarProposals(
        orgClerkId,
        `${rfpData.clientName} ${rfpData.industry} ${rfpData.goals.join(' ')}`
      )
    })

    const proposalContext = (similarProposals as ProposalChunk[])
      .map((p) => `- ${p.fileName} (similarity: ${p.similarity.toFixed(2)})`)
      .join('\n')

    const sections = await step.run('generate-with-claude', async () => {
      return generatePitchSections({ rfpData, proposalContext })
    })

    await step.run('save-and-create-deck', async () => {
      await db.pitch.update({
        where: { id: pitchId },
        data: { status: 'DONE', sections: sections as object },
      })
      await db.deck.create({ data: { pitchId } })
    })
  }
)
