import { claude } from './claude'
import type { RfpData } from './extract-rfp'

export interface PitchSections {
  executiveSummary: string
  whyUs: string
  audienceReach: string
  deliverables: string
  pricing: string
  timeline: string
  cta: string
}

export async function generatePitchSections({
  rfpData,
  proposalContext,
}: {
  rfpData: RfpData
  proposalContext: string
}): Promise<PitchSections> {
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: 'You are an expert esports sponsorship pitch writer. Write compelling, specific, and data-driven pitch sections.',
    messages: [{
      role: 'user',
      content: `Write a sponsorship pitch for ${rfpData.clientName} (${rfpData.industry}).

RFP Details:
- Budget: ${rfpData.budgetRange}
- Deliverables wanted: ${rfpData.deliverables.join(', ')}
- Timeline: ${rfpData.timeline}
- Target Audience: ${rfpData.targetAudience}
- Goals: ${rfpData.goals.join(', ')}

Reference from our past successful proposals:
${proposalContext}

Return ONLY valid JSON matching this schema:
{
  "executiveSummary": string,
  "whyUs": string,
  "audienceReach": string,
  "deliverables": string,
  "pricing": string,
  "timeline": string,
  "cta": string
}`,
    }],
  })

  const raw = response.content[0]
  if (raw.type !== 'text') throw new Error('Unexpected response type from Claude')
  return JSON.parse(raw.text) as PitchSections
}
