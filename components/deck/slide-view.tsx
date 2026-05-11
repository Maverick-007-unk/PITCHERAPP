import type { PitchSections } from '@/lib/ai/generate-pitch'

const SLIDE_LABELS: Record<keyof PitchSections, string> = {
  executiveSummary: 'Executive Summary',
  whyUs: 'Why Us',
  audienceReach: 'Audience',
  deliverables: 'What You Get',
  pricing: 'Investment',
  timeline: 'Timeline',
  cta: "Let's Talk",
}

export function SlideView({ sections, themeName }: { sections: PitchSections; themeName: string }) {
  const isKineticOrange = themeName === 'Kinetic Orange'

  return (
    <div className="space-y-1">
      {(Object.keys(SLIDE_LABELS) as Array<keyof PitchSections>).map((key) => (
        <div
          key={key}
          className="min-h-[320px] border border-[#222] p-12 flex flex-col justify-between"
          style={{ background: isKineticOrange ? '#000' : '#0a0a14' }}
        >
          <p className="font-mono text-[9px] uppercase tracking-tight2 text-ko-orange">
            // {SLIDE_LABELS[key]}
          </p>
          <p className="font-archivo text-4xl uppercase tracking-tight4 leading-brutalist text-ko-white max-w-3xl">
            {sections[key]}
          </p>
        </div>
      ))}
    </div>
  )
}
