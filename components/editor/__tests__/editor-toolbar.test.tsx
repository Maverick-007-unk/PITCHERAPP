import { render, screen, fireEvent } from '@testing-library/react'
import { EditorToolbar } from '../editor-toolbar'

const defaultProps = {
  activeTool: 'select' as const,
  onToolChange: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  canUndo: false,
  canRedo: false,
  saveStatus: 'saved' as const,
  onPublish: vi.fn(),
  isPublished: false,
  pitchId: 'pitch-1',
}

test('renders TEXT, SHAPE, and IMAGE tool buttons', () => {
  render(<EditorToolbar {...defaultProps} />)
  expect(screen.getByRole('button', { name: /text/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /shape/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /image/i })).toBeInTheDocument()
})

test('calls onToolChange with correct tool when button clicked', () => {
  const onToolChange = vi.fn()
  render(<EditorToolbar {...defaultProps} onToolChange={onToolChange} />)
  fireEvent.click(screen.getByRole('button', { name: /text/i }))
  expect(onToolChange).toHaveBeenCalledWith('text')
})

test('shows SAVED status', () => {
  render(<EditorToolbar {...defaultProps} saveStatus="saved" />)
  expect(screen.getByText('SAVED')).toBeInTheDocument()
})

test('shows SAVING status', () => {
  render(<EditorToolbar {...defaultProps} saveStatus="saving" />)
  expect(screen.getByText('SAVING...')).toBeInTheDocument()
})

test('undo button is disabled when canUndo is false', () => {
  render(<EditorToolbar {...defaultProps} canUndo={false} />)
  expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled()
})

test('calls onUndo when undo button is clicked and enabled', () => {
  const onUndo = vi.fn()
  render(<EditorToolbar {...defaultProps} canUndo={true} onUndo={onUndo} />)
  fireEvent.click(screen.getByRole('button', { name: /undo/i }))
  expect(onUndo).toHaveBeenCalled()
})

test('calls onPublish when publish button is clicked', () => {
  const onPublish = vi.fn()
  render(<EditorToolbar {...defaultProps} onPublish={onPublish} />)
  fireEvent.click(screen.getByRole('button', { name: /publish/i }))
  expect(onPublish).toHaveBeenCalled()
})
