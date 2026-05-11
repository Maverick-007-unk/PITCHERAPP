import { db } from '@/lib/db/client'
import { embedText } from './embed'

export interface ProposalChunk {
  fileName: string
  similarity: number
}

export async function retrieveSimilarProposals(orgId: string, query: string, topK = 3): Promise<ProposalChunk[]> {
  const org = await db.org.findUniqueOrThrow({ where: { clerkOrgId: orgId } })
  const queryEmbedding = await embedText(query)

  const results = await db.$queryRaw<Array<{ fileName: string; similarity: number }>>`
    SELECT "fileName", 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
    FROM "OldProposal"
    WHERE "orgId" = ${org.id}
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${topK}
  `
  return results
}
