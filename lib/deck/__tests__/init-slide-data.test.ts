import { describe, test, expect } from 'vitest'
import { initSlideData } from '../init-slide-data'
import type { PitchSections } from '@/lib/ai/generate-pitch'

const sections: PitchSections = {
  executiveSummary: 'Exec summary content',
  whyUs: 'Why us content',
  audienceReach: 'Audience content',
  deliverables: 'Deliverables content',
  pricing: 'Pricing content',
  timeline: 'Timeline content',
  cta: 'CTA content',
}

describe('initSlideData', () => {
  test('returns exactly 7 slides', () => {
    const slides = initSlideData(sections, '#000000')
    expect(slides).toHaveLength(7)
  })

  test('first slide label is Executive Summary', () => {
    const slides = initSlideData(sections, '#000000')
    expect(slides[0].label).toBe('Executive Summary')
  })

  test('last slide label is Let\'s Talk', () => {
    const slides = initSlideData(sections, '#000000')
    expect(slides[6].label).toBe("Let's Talk")
  })

  test('each slide has the theme background color', () => {
    const slides = initSlideData(sections, '#0a0a14')
    expect(slides.every(s => s.background === '#0a0a14')).toBe(true)
  })

  test('each slide has a content element with the section text', () => {
    const slides = initSlideData(sections, '#000000')
    const execSlide = slides[0]
    const contentEl = execSlide.elements.find(e => e.content === 'Exec summary content')
    expect(contentEl).toBeDefined()
    expect(contentEl?.type).toBe('text')
    expect(contentEl?.fontFamily).toBe('archivo-black')
  })

  test('uses white text on dark background', () => {
    const slides = initSlideData(sections, '#000000')
    const contentEl = slides[0].elements.find(e => e.fontFamily === 'archivo-black')
    expect(contentEl?.color).toBe('#FFFFFF')
  })

  test('uses black text on white background', () => {
    const slides = initSlideData(sections, '#ffffff')
    const contentEl = slides[0].elements.find(e => e.fontFamily === 'archivo-black')
    expect(contentEl?.color).toBe('#000000')
  })

  test('all slide ids are unique', () => {
    const slides = initSlideData(sections, '#000000')
    const ids = new Set(slides.map(s => s.id))
    expect(ids.size).toBe(7)
  })

  test('all element ids are unique across all slides', () => {
    const slides = initSlideData(sections, '#000000')
    const ids = slides.flatMap(s => s.elements.map(e => e.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
