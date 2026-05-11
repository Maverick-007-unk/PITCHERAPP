import { render, screen } from '@testing-library/react'
import { SlideView } from '../slide-view'

const sections = {
  executiveSummary: 'We reach 40M fans globally.',
  whyUs: 'ROI-driven activations.',
  audienceReach: '18-34 gamers',
  deliverables: 'Logo + 3 posts/month',
  pricing: '$600K for 12 months',
  timeline: 'Q3 2026 start',
  cta: "Let's build something iconic.",
}

test('renders executive summary slide', () => {
  render(<SlideView sections={sections} themeName="Kinetic Orange" />)
  expect(screen.getByText(/40M fans/i)).toBeInTheDocument()
})

test('renders CTA slide', () => {
  render(<SlideView sections={sections} themeName="Kinetic Orange" />)
  expect(screen.getByText(/iconic/i)).toBeInTheDocument()
})
