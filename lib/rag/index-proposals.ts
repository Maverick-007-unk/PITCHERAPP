import * as fs from 'fs/promises'
import * as path from 'path'
import { db } from '@/lib/db/client'
import { uploadFile, buildStorageKey } from '@/lib/storage/r2'
import { extractText } from '@/lib/parser/extract-text'
import { embedText } from './embed'

const PROPOSALS_DIR = path.join(process.cwd(), 'Old Proposals')

export async function indexOldProposals(orgId: string): Promise<void> {
  const org = await db.org.findUniqueOrThrow({ where: { clerkOrgId: orgId } })

  let files: string[]
  try {
    files = await fs.readdir(PROPOSALS_DIR)
  } catch {
    console.warn('Old Proposals/ directory not found — skipping RAG indexing')
    return
  }

  for (const fileName of files) {
    const existing = await db.oldProposal.findFirst({ where: { orgId: org.id, fileName } })
    if (existing) continue

    const filePath = path.join(PROPOSALS_DIR, fileName)
    const buffer = await fs.readFile(filePath)
    const mimeType = fileName.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    const text = await extractText(buffer, mimeType)
    const embedding = await embedText(text)

    const key = buildStorageKey(org.id, fileName).replace('/rfp/', '/proposals/')
    await uploadFile(key, buffer, mimeType)

    await db.$executeRaw`
      INSERT INTO "OldProposal" (id, "orgId", "fileName", "storageKey", embedding, "createdAt")
      VALUES (gen_random_uuid(), ${org.id}, ${fileName}, ${key}, ${JSON.stringify(embedding)}::vector, NOW())
    `
  }
}
