import { claude } from './claude'

export interface RfpData {
  clientName: string
  industry: string
  budgetRange: string
  deliverables: string[]
  timeline: string
  targetAudience: string
  goals: string[]
  successMetrics: string[]
}

export async function extractRfpData(text: string): Promise<RfpData> {
  const response = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Extract sponsorship RFP data from the following document. Return ONLY valid JSON matching this schema:
{
  "clientName": string,
  "industry": string,
  "budgetRange": string,
  "deliverables": string[],
  "timeline": string,
  "targetAudience": string,
  "goals": string[],
  "successMetrics": string[]
}

Document:
${text.slice(0, 8000)}`,
    }],
  })

  const raw = response.content[0]
  if (raw.type !== 'text') throw new Error('Unexpected response type from Claude')
  return JSON.parse(raw.text) as RfpData
}
