import { randomUUID } from 'crypto'
import type { PitchSections } from '@/lib/ai/generate-pitch'
import type { SlideData, SlideElement } from './types'

const SECTION_ORDER: Array<keyof PitchSections> = [
  'executiveSummary',
  'whyUs',
  'audienceReach',
  'deliverables',
  'pricing',
  'timeline',
  'cta',
]

const SECTION_LABELS: Record<keyof PitchSections, string> = {
  executiveSummary: 'Executive Summary',
  whyUs: 'Why Us',
  audienceReach: 'Audience',
  deliverables: 'What You Get',
  pricing: 'Investment',
  timeline: 'Timeline',
  cta: "Let's Talk",
}

function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000000' : '#FFFFFF'
}

export function initSlideData(sections: PitchSections, themeBackground: string): SlideData {
  const textColor = contrastColor(themeBackground)

  return SECTION_ORDER.map((key) => {
    const labelElement: SlideElement = {
      id: randomUUID(),
      type: 'text',
      x: 5, y: 5, w: 90, h: 10,
      zIndex: 1,
      content: `// ${SECTION_LABELS[key]}`,
      fontSize: 12,
      fontFamily: 'space-mono',
      color: '#FF4D00',
      textTransform: 'uppercase',
      textAlign: 'left',
      lineHeight: 1.2,
    }

    const contentElement: SlideElement = {
      id: randomUUID(),
      type: 'text',
      x: 5, y: 40, w: 90, h: 50,
      zIndex: 2,
      content: sections[key],
      fontSize: 48,
      fontFamily: 'archivo-black',
      color: textColor,
      textTransform: 'uppercase',
      textAlign: 'left',
      lineHeight: 0.9,
    }

    return {
      id: randomUUID(),
      label: SECTION_LABELS[key],
      background: themeBackground,
      elements: [labelElement, contentElement],
    }
  })
}
