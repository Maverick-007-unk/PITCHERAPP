import { describe, it, expect, vi } from 'vitest'

vi.mock('../claude', () => ({
  claude: {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          clientName: 'Red Bull',
          industry: 'Energy Drinks',
          budgetRange: '$500k-$1M',
          deliverables: ['logo placement', 'social posts'],
          timeline: 'Q3 2026',
          targetAudience: '18-34 gamers',
          goals: ['brand awareness'],
          successMetrics: ['impressions'],
        }) }],
      }),
    },
  },
}))

import { extractRfpData } from '../extract-rfp'

it('extracts structured data from RFP text', async () => {
  const result = await extractRfpData('We are Red Bull looking for esports sponsorship...')
  expect(result.clientName).toBe('Red Bull')
  expect(result.deliverables).toContain('logo placement')
})
