import { render, screen, fireEvent } from '@testing-library/react'
import { PropertiesPanel } from '../properties-panel'
import type { SlideElement } from '@/lib/deck/types'

const textElement: SlideElement = {
  id: 'e1',
  type: 'text',
  x: 5,
  y: 5,
  w: 90,
  h: 20,
  zIndex: 1,
  content: 'Hello',
  fontSize: 48,
  fontFamily: 'archivo-black',
  color: '#FFFFFF',
  textTransform: 'uppercase',
}

test('shows "No element selected" when element is null', () => {
  render(<PropertiesPanel element={null} onUpdate={vi.fn()} onDelete={vi.fn()} />)
  expect(screen.getByText(/no element selected/i)).toBeInTheDocument()
})

test('shows font family selector for text elements', () => {
  render(<PropertiesPanel element={textElement} onUpdate={vi.fn()} onDelete={vi.fn()} />)
  expect(screen.getByDisplayValue('Archivo Black')).toBeInTheDocument()
})

test('shows font size input for text elements', () => {
  render(<PropertiesPanel element={textElement} onUpdate={vi.fn()} onDelete={vi.fn()} />)
  expect(screen.getByDisplayValue('48')).toBeInTheDocument()
})

test('calls onUpdate with new fontSize when size input changes', () => {
  const onUpdate = vi.fn()
  render(<PropertiesPanel element={textElement} onUpdate={onUpdate} onDelete={vi.fn()} />)
  fireEvent.change(screen.getByDisplayValue('48'), { target: { value: '64' } })
  expect(onUpdate).toHaveBeenCalledWith({ fontSize: 64 })
})

test('calls onDelete when delete button is clicked', () => {
  const onDelete = vi.fn()
  render(<PropertiesPanel element={textElement} onUpdate={vi.fn()} onDelete={onDelete} />)
  fireEvent.click(screen.getByRole('button', { name: /delete element/i }))
  expect(onDelete).toHaveBeenCalled()
})
