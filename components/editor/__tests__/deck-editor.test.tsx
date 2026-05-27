import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { DeckEditor } from '../deck-editor'
import type { SlideData } from '@/lib/deck/types'

vi.mock('../canvas-area', () => ({
  CanvasArea: vi.fn(({ slide }: any) => (
    <div data-testid="canvas-area" data-slide-id={slide.id} />
  )),
}))

vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<any>) => {
    const Component = vi.fn(({ slide }: any) => (
      <div data-testid="canvas-area" data-slide-id={slide.id} />
    ))
    return Component
  },
}))

const slides: SlideData = [
  { id: 's1', label: 'Executive Summary', background: '#000000', elements: [] },
  { id: 's2', label: 'Why Us', background: '#000000', elements: [] },
]

const defaultProps = {
  deckId: 'deck-1',
  pitchId: 'pitch-1',
  initialSlides: slides,
  shareToken: 'tok-abc',
  isPublished: false,
  imageUrls: {},
}

test('renders the slide panel with all slides', () => {
  render(<DeckEditor {...defaultProps} />)
  expect(screen.getByText('Executive Summary')).toBeInTheDocument()
  expect(screen.getByText('Why Us')).toBeInTheDocument()
})

test('renders the editor toolbar', () => {
  render(<DeckEditor {...defaultProps} />)
  expect(screen.getByRole('button', { name: /text/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument()
})

test('renders the properties panel', () => {
  render(<DeckEditor {...defaultProps} />)
  expect(screen.getByText(/no element selected/i)).toBeInTheDocument()
})

test('shows SAVED save status initially', () => {
  render(<DeckEditor {...defaultProps} />)
  expect(screen.getByText('SAVED')).toBeInTheDocument()
})

test('switches to second slide when it is clicked in panel', () => {
  render(<DeckEditor {...defaultProps} />)
  fireEvent.click(screen.getByText('Why Us'))
  expect(screen.getByTestId('canvas-area')).toHaveAttribute('data-slide-id', 's2')
})
