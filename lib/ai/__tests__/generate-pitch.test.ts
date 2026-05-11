import { describe, it, expect, vi } from 'vitest'

vi.mock('../claude', () => ({
  claude: {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          executiveSummary: 'Team Liquid reaches 40M fans globally.',
          whyUs: 'We deliver ROI through integrated activations.',
          audienceReach: '18-34 male-skewing, 60% NA',
          deliverables: 'Logo on jersey + 3 social posts/month',
          pricing: '$600K for a 12-month partnership',
          timeline: 'Activation begins Q3 2026',
          cta: 'Let\'s build something iconic together.',
        }) }],
      }),
    },
  },
}))

import { generatePitchSections } from '../generate-pitch'

it('generates all required pitch sections', async () => {
  const result = await generatePitchSections({
    rfpData: {
      clientName: 'Red Bull',
      industry: 'Energy Drinks',
      budgetRange: '$500k-$1M',
      deliverables: [],
      timeline: 'Q3',
      targetAudience: 'Gamers',
      goals: [],
      successMetrics: [],
    },
    proposalContext: 'Past proposal: Team Liquid x BMW...',
  })
  expect(result.executiveSummary).toBeTruthy()
  expect(result.pricing).toBeTruthy()
  expect(result.cta).toBeTruthy()
})
