import { render, screen, fireEvent } from '@testing-library/react'
import { SlidePanel } from '../slide-panel'
import type { Slide } from '@/lib/deck/types'

const slides: Slide[] = [
  { id: 's1', label: 'Executive Summary', background: '#000000', elements: [] },
  { id: 's2', label: 'Why Us', background: '#000000', elements: [] },
  { id: 's3', label: 'Audience', background: '#000000', elements: [] },
]

const defaultProps = {
  slides,
  currentIndex: 0,
  onSelect: vi.fn(),
  onReorder: vi.fn(),
  onAdd: vi.fn(),
  onDelete: vi.fn(),
}

test('renders all slide labels', () => {
  render(<SlidePanel {...defaultProps} />)
  expect(screen.getByText('Executive Summary')).toBeInTheDocument()
  expect(screen.getByText('Why Us')).toBeInTheDocument()
  expect(screen.getByText('Audience')).toBeInTheDocument()
})

test('calls onSelect with correct index when slide is clicked', () => {
  const onSelect = vi.fn()
  render(<SlidePanel {...defaultProps} onSelect={onSelect} />)
  fireEvent.click(screen.getByText('Why Us'))
  expect(onSelect).toHaveBeenCalledWith(1)
})

test('calls onAdd when + ADD SLIDE button is clicked', () => {
  const onAdd = vi.fn()
  render(<SlidePanel {...defaultProps} onAdd={onAdd} />)
  fireEvent.click(screen.getByText(/add slide/i))
  expect(onAdd).toHaveBeenCalled()
})

test('calls onDelete when delete button is clicked', () => {
  const onDelete = vi.fn()
  render(<SlidePanel {...defaultProps} onDelete={onDelete} />)
  const deleteButtons = screen.getAllByRole('button', { name: /delete slide/i })
  fireEvent.click(deleteButtons[1])
  expect(onDelete).toHaveBeenCalledWith(1)
})

test('renders slide numbers', () => {
  render(<SlidePanel {...defaultProps} />)
  expect(screen.getByText('01')).toBeInTheDocument()
  expect(screen.getByText('02')).toBeInTheDocument()
})
