import { render, screen } from '@testing-library/react'
import { Sidebar } from '../sidebar'

test('renders sidebar with RFP nav link', () => {
  render(<Sidebar activeItem="rfp" />)
  expect(screen.getByLabelText('RFPs')).toBeInTheDocument()
})

test('active item has orange border class', () => {
  render(<Sidebar activeItem="rfp" />)
  expect(screen.getByLabelText('RFPs')).toHaveClass('border-ko-orange')
})
