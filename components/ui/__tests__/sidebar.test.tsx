import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/rfp/123'),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import { Sidebar } from '../sidebar'

test('renders sidebar with RFP nav link', () => {
  render(<Sidebar />)
  expect(screen.getByLabelText('RFPs')).toBeInTheDocument()
})

test('active item has orange border class when on rfp route', () => {
  render(<Sidebar />)
  expect(screen.getByLabelText('RFPs')).toHaveClass('border-ko-orange')
})
