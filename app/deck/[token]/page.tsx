import { notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { SlideView } from '@/components/deck/slide-view'
import type { SlideData } from '@/lib/deck/types'

export default async function PublicDeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ print?: string }>
}) {
  const { token } = await params
  const { print } = await searchParams

  const deck = await db.deck.findUnique({
    where: { shareToken: token },
    include: { pitch: { include: { theme: true } } },
  })

  if (!deck || !deck.publishedAt) notFound()
  if (!deck.slideData) notFound()

  const slides = deck.slideData as unknown as SlideData
  const isPrint = print === '1'

  if (isPrint) {
    return (
      <div style={{ margin: 0, padding: 0 }}>
        {slides.map((slide) => (
          <div
            key={slide.id}
            style={{
              width: '1920px',
              height: '1080px',
              background: slide.background,
              position: 'relative',
              overflow: 'hidden',
              pageBreakAfter: 'always',
            }}
          >
            {[...slide.elements]
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((el) => {
                if (el.type !== 'text') return null
                return (
                  <p
                    key={el.id}
                    style={{
                      position: 'absolute',
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: `${el.w}%`,
                      fontSize: el.fontSize ? `${el.fontSize}px` : undefined,
                      fontFamily: el.fontFamily === 'archivo-black'
                        ? '"Archivo Black", sans-serif'
                        : el.fontFamily === 'space-mono'
                        ? '"Space Mono", monospace'
                        : 'Inter, sans-serif',
                      color: el.color ?? '#FFFFFF',
                      textTransform: el.textTransform === 'uppercase' ? 'uppercase' : undefined,
                      lineHeight: el.lineHeight ?? 1.2,
                      margin: 0,
                    }}
                  >
                    {el.content}
                  </p>
                )
              })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ko-black">
      <div className="border-b-2 border-[#222] p-4 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange">// Pitcher</p>
        <p className="font-mono text-[10px] uppercase tracking-tight2 text-[#555]">Sponsorship Proposal</p>
      </div>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <SlideView slides={slides} />
      </div>
    </div>
  )
}
