import { render, screen } from '@testing-library/react'
import { SlideView } from '../slide-view'
import type { SlideData } from '@/lib/deck/types'

const slides: SlideData = [
  {
    id: 'slide-1',
    label: 'Executive Summary',
    background: '#000000',
    elements: [
      {
        id: 'el-1',
        type: 'text',
        x: 5, y: 5, w: 90, h: 10,
        zIndex: 1,
        content: '// EXECUTIVE SUMMARY',
        fontSize: 12,
        fontFamily: 'space-mono',
        color: '#FF4D00',
      },
      {
        id: 'el-2',
        type: 'text',
        x: 5, y: 40, w: 90, h: 50,
        zIndex: 2,
        content: 'We reach 40M fans globally.',
        fontSize: 48,
        fontFamily: 'archivo-black',
        color: '#FFFFFF',
      },
    ],
  },
  {
    id: 'slide-2',
    label: "Let's Talk",
    background: '#000000',
    elements: [
      {
        id: 'el-3',
        type: 'text',
        x: 5, y: 40, w: 90, h: 50,
        zIndex: 1,
        content: "Let's build something iconic.",
        fontSize: 48,
        fontFamily: 'archivo-black',
        color: '#FFFFFF',
      },
    ],
  },
]

test('renders executive summary content', () => {
  render(<SlideView slides={slides} />)
  expect(screen.getByText(/40M fans/i)).toBeInTheDocument()
})

test('renders CTA content', () => {
  render(<SlideView slides={slides} />)
  expect(screen.getByText(/iconic/i)).toBeInTheDocument()
})

test('renders one container per slide', () => {
  const { container } = render(<SlideView slides={slides} />)
  // Two slides = two relative-positioned containers inside the space-y-1 wrapper
  const slideContainers = container.querySelectorAll('.relative')
  expect(slideContainers.length).toBe(2)
})
