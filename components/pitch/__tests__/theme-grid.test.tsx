import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { ThemeGrid } from '../theme-grid'

const themes = [
  { id: 'kinetic-orange', name: 'Kinetic Orange', thumbnailUrl: '/t.png', config: {} },
  { id: 'midnight-pro', name: 'Midnight Pro', thumbnailUrl: '/t.png', config: {} },
]

test('renders all theme cards', () => {
  render(<ThemeGrid themes={themes} onSelect={() => {}} />)
  expect(screen.getByText('Kinetic Orange')).toBeInTheDocument()
  expect(screen.getByText('Midnight Pro')).toBeInTheDocument()
})

test('calls onSelect when theme card is clicked', () => {
  const onSelect = vi.fn()
  render(<ThemeGrid themes={themes} onSelect={onSelect} />)
  fireEvent.click(screen.getByText('Kinetic Orange'))
  expect(onSelect).toHaveBeenCalledWith('kinetic-orange')
})
