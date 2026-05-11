import { render, screen } from '@testing-library/react'
import { PillButton } from '../pill-button'

test('renders primary pill button with correct text', () => {
  render(<PillButton>Upload RFP</PillButton>)
  expect(screen.getByRole('button', { name: 'Upload RFP' })).toBeInTheDocument()
})

test('renders outline variant', () => {
  render(<PillButton variant="outline">Cancel</PillButton>)
  const btn = screen.getByRole('button', { name: 'Cancel' })
  expect(btn).toHaveClass('border-ko-white/30')
})
