# Phase 2 Deck Editor & Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Fabric.js canvas deck editor with slide management, image upload, auto-save, and PPTX + PDF export.

**Architecture:** A typed `SlideElement` schema (not raw Fabric JSON) is the canonical data model stored in `Deck.slideData`. Fabric.js renders this schema in the editor; plain React renders it on the public deck page. A Fabric bridge translates between Fabric objects and `SlideElement[]` on every canvas event. Export reads the same `SlideData` — Puppeteer for PDF, pptxgenjs for PPTX.

**Tech Stack:** Next.js App Router · TypeScript · Fabric.js v6 · @dnd-kit/sortable · pptxgenjs · Puppeteer · Prisma · Cloudflare R2

---

## File Map

**New files:**
```
lib/deck/types.ts
lib/deck/init-slide-data.ts
lib/deck/__tests__/init-slide-data.test.ts
lib/deck/fabric-bridge.ts
lib/deck/__tests__/fabric-bridge.test.ts
lib/export/pptx.ts
lib/export/__tests__/pptx.test.ts
lib/export/pdf.ts
lib/export/__tests__/pdf.test.ts
components/editor/editor-toolbar.tsx
components/editor/__tests__/editor-toolbar.test.tsx
components/editor/slide-panel.tsx
components/editor/__tests__/slide-panel.test.tsx
components/editor/properties-panel.tsx
components/editor/__tests__/properties-panel.test.tsx
components/editor/canvas-area.tsx
components/editor/deck-editor.tsx
components/editor/__tests__/deck-editor.test.tsx
app/(app)/pitch/[id]/editor/page.tsx
app/(app)/pitch/[id]/editor/editor-client.tsx
app/api/deck/[id]/save/route.ts
app/api/deck/[id]/upload-image/route.ts
app/api/pitch/export/route.ts
```

**Modified files:**
```
prisma/schema.prisma              — add slideData Json? to Deck
lib/inngest/pitch-generate.ts     — call initSlideData after deck create
components/deck/slide-view.tsx    — render SlideData instead of PitchSections
components/deck/__tests__/slide-view.test.tsx  — update tests
app/deck/[token]/page.tsx         — read slideData + ?print=1 layout
app/(app)/pitch/[id]/page.tsx     — add Open Editor button
```

---

## Task 1: Setup — Dependencies, Migration, and Types

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `lib/deck/types.ts`

- [ ] **Step 1: Install new npm dependencies**

```bash
npm install fabric @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities pptxgenjs puppeteer
```

Expected: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Add slideData to Deck model**

In `prisma/schema.prisma`, update the `Deck` model:

```prisma
model Deck {
  id          String    @id @default(cuid())
  pitchId     String    @unique
  slideData   Json?
  shareToken  String    @unique @default(cuid())
  publishedAt DateTime?
  pitch       Pitch     @relation(fields: [pitchId], references: [id])
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name add-deck-slide-data
```

Expected output includes: `The following migration(s) have been created and applied` and `✓ Generated Prisma Client`.

- [ ] **Step 4: Create `lib/deck/types.ts`**

```ts
export type SlideElementType = 'text' | 'image' | 'shape'

export interface SlideElement {
  id: string
  type: SlideElementType
  x: number        // % of slide width (0–100)
  y: number        // % of slide height (0–100)
  w: number        // % of slide width (0–100)
  h: number        // % of slide height (0–100)
  zIndex: number

  // text
  content?: string
  fontSize?: number
  fontFamily?: 'archivo-black' | 'space-mono' | 'inter'
  fontWeight?: number
  color?: string
  textTransform?: 'none' | 'uppercase'
  textAlign?: 'left' | 'center' | 'right'
  lineHeight?: number

  // image
  storageKey?: string
  objectFit?: 'cover' | 'contain'

  // shape
  fill?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
}

export interface Slide {
  id: string
  label: string
  background: string
  elements: SlideElement[]
}

export type SlideData = Slide[]
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma lib/deck/types.ts package.json package-lock.json
git commit -m "feat: add slideData migration, deck types, and Phase 2 dependencies"
```

---

## Task 2: Slide Data Initializer

**Files:**
- Create: `lib/deck/__tests__/init-slide-data.test.ts`
- Create: `lib/deck/init-slide-data.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/deck/__tests__/init-slide-data.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run lib/deck/__tests__/init-slide-data.test.ts
```

Expected: all 9 tests fail with "Cannot find module '../init-slide-data'".

- [ ] **Step 3: Create `lib/deck/init-slide-data.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run lib/deck/__tests__/init-slide-data.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/deck/
git commit -m "feat: initSlideData converts PitchSections to typed SlideData"
```

---

## Task 3: Wire Initializer into Pitch Generation

**Files:**
- Modify: `lib/inngest/pitch-generate.ts`

- [ ] **Step 1: Update `lib/inngest/pitch-generate.ts`**

Replace the entire file contents:

```ts
import { inngest } from './client'
import { db } from '@/lib/db/client'
import { retrieveSimilarProposals } from '@/lib/rag/retrieve'
import type { ProposalChunk } from '@/lib/rag/retrieve'
import { generatePitchSections } from '@/lib/ai/generate-pitch'
import type { RfpData } from '@/lib/ai/extract-rfp'
import { initSlideData } from '@/lib/deck/init-slide-data'

export const pitchGenerateFunction = inngest.createFunction(
  { id: 'pitch-generate', name: 'Generate Pitch Sections', triggers: [{ event: 'pitch/generate' }] },
  async ({ event, step }: { event: any; step: any }) => {
    const { pitchId, orgClerkId } = event.data

    await step.run('mark-running', async () => {
      await db.pitch.update({ where: { id: pitchId }, data: { status: 'RUNNING' } })
    })

    const pitch = await step.run('load-pitch', async () => {
      return db.pitch.findUniqueOrThrow({
        where: { id: pitchId },
        include: { rfp: true, theme: true },
      })
    })

    const rfpData = pitch.rfp.extractedJson as RfpData

    const similarProposals = await step.run('retrieve-proposals', async () => {
      return retrieveSimilarProposals(
        orgClerkId,
        `${rfpData.clientName} ${rfpData.industry} ${rfpData.goals.join(' ')}`
      )
    })

    const proposalContext = (similarProposals as ProposalChunk[])
      .map((p) => `- ${p.fileName} (similarity: ${p.similarity.toFixed(2)})`)
      .join('\n')

    const sections = await step.run('generate-with-claude', async () => {
      return generatePitchSections({ rfpData, proposalContext })
    })

    await step.run('save-and-create-deck', async () => {
      const themeConfig = pitch.theme.config as { bg: string }
      const slideData = initSlideData(sections, themeConfig.bg)

      await db.pitch.update({
        where: { id: pitchId },
        data: { status: 'DONE', sections: sections as object },
      })
      await db.deck.create({
        data: {
          pitchId,
          slideData: slideData as unknown as object,
        },
      })
    })
  }
)
```

- [ ] **Step 2: Run the existing test suite to verify no regressions**

```bash
npx vitest run
```

Expected: all previously passing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add lib/inngest/pitch-generate.ts
git commit -m "feat: populate deck slideData from initSlideData after pitch generation"
```

---

## Task 4: Update SlideView and Public Deck Page

**Files:**
- Modify: `components/deck/slide-view.tsx`
- Modify: `components/deck/__tests__/slide-view.test.tsx`
- Modify: `app/deck/[token]/page.tsx`

- [ ] **Step 1: Update `components/deck/slide-view.tsx`**

Replace the entire file:

```tsx
import type { SlideData, SlideElement } from '@/lib/deck/types'

function ElementRenderer({ el }: { el: SlideElement }) {
  if (el.type === 'text') {
    return (
      <p
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          fontSize: el.fontSize ? `${el.fontSize}px` : undefined,
          fontFamily: el.fontFamily === 'archivo-black' ? '"Archivo Black", sans-serif'
            : el.fontFamily === 'space-mono' ? '"Space Mono", monospace'
            : 'Inter, sans-serif',
          color: el.color ?? '#FFFFFF',
          textTransform: el.textTransform === 'uppercase' ? 'uppercase' : undefined,
          textAlign: el.textAlign ?? 'left',
          lineHeight: el.lineHeight ?? 1.2,
          margin: 0,
        }}
      >
        {el.content}
      </p>
    )
  }
  if (el.type === 'shape') {
    return (
      <div
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          background: el.fill ?? '#222',
          border: el.borderColor ? `${el.borderWidth ?? 1}px solid ${el.borderColor}` : undefined,
          borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
        }}
      />
    )
  }
  if (el.type === 'image' && el.storageKey) {
    return (
      <img
        src={el.storageKey}
        alt=""
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          objectFit: el.objectFit ?? 'cover',
        }}
      />
    )
  }
  return null
}

export function SlideView({ slides }: { slides: SlideData }) {
  return (
    <div className="space-y-1">
      {slides.map((slide) => (
        <div
          key={slide.id}
          className="relative overflow-hidden"
          style={{
            background: slide.background,
            paddingTop: '56.25%', // 16:9 aspect ratio
          }}
        >
          <div className="absolute inset-0">
            {[...slide.elements]
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((el) => (
                <ElementRenderer key={el.id} el={el} />
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update `components/deck/__tests__/slide-view.test.tsx`**

Replace the entire file:

```tsx
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
```

- [ ] **Step 3: Update `app/deck/[token]/page.tsx`**

Replace the entire file:

```tsx
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
```

- [ ] **Step 4: Run updated tests**

```bash
npx vitest run components/deck/__tests__/slide-view.test.tsx
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/deck/ app/deck/
git commit -m "feat: update SlideView and public deck page to render typed SlideData"
```

---

## Task 5: Fabric Bridge

**Files:**
- Create: `lib/deck/__tests__/fabric-bridge.test.ts`
- Create: `lib/deck/fabric-bridge.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/deck/__tests__/fabric-bridge.test.ts`:

```ts
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { loadSlide, serializeCanvas } from '../fabric-bridge'
import type { Slide } from '../types'

vi.mock('fabric', () => ({
  IText: vi.fn(function (this: any, text: string, opts: any = {}) {
    this.type = 'i-text'
    this.text = text
    this.left = opts.left ?? 0
    this.top = opts.top ?? 0
    this.width = opts.width ?? 100
    this.scaleX = 1
    this.scaleY = 1
    this.fontSize = opts.fontSize
    this.fontFamily = opts.fontFamily
    this.fill = opts.fill
    this.textAlign = opts.textAlign
    this.lineHeight = opts.lineHeight
  }),
  Rect: vi.fn(function (this: any, opts: any = {}) {
    this.type = 'rect'
    this.left = opts.left ?? 0
    this.top = opts.top ?? 0
    this.width = opts.width ?? 100
    this.height = opts.height ?? 100
    this.scaleX = 1
    this.scaleY = 1
    this.fill = opts.fill
    this.stroke = opts.stroke
    this.strokeWidth = opts.strokeWidth
    this.rx = opts.rx
  }),
  Image: {
    fromURL: vi.fn(async (_url: string) => ({
      type: 'image',
      left: 0, top: 0, width: 100, height: 100,
      scaleX: 1, scaleY: 1,
      set: vi.fn(function (this: any, props: any) { Object.assign(this, props) }),
    })),
  },
}))

function makeMockCanvas() {
  const objects: any[] = []
  return {
    objects,
    clear: vi.fn(() => { objects.length = 0 }),
    setBackgroundColor: vi.fn((_c: string, cb?: () => void) => cb?.()),
    add: vi.fn((obj: any) => objects.push(obj)),
    getObjects: vi.fn(() => [...objects]),
    renderAll: vi.fn(),
    getWidth: vi.fn(() => 1920),
    getHeight: vi.fn(() => 1080),
  }
}

describe('loadSlide', () => {
  beforeEach(() => vi.clearAllMocks())

  test('calls canvas.clear() before adding elements', async () => {
    const canvas = makeMockCanvas()
    const slide: Slide = { id: 's1', label: 'Test', background: '#000000', elements: [] }
    await loadSlide(canvas as any, slide, vi.fn())
    expect(canvas.clear).toHaveBeenCalled()
  })

  test('sets the slide background color', async () => {
    const canvas = makeMockCanvas()
    const slide: Slide = { id: 's1', label: 'Test', background: '#FF4D00', elements: [] }
    await loadSlide(canvas as any, slide, vi.fn())
    expect(canvas.setBackgroundColor).toHaveBeenCalledWith('#FF4D00', expect.any(Function))
  })

  test('adds one IText object for a text element', async () => {
    const canvas = makeMockCanvas()
    const slide: Slide = {
      id: 's1', label: 'Test', background: '#000000',
      elements: [{
        id: 'e1', type: 'text', x: 5, y: 5, w: 90, h: 20, zIndex: 1,
        content: 'Hello World', fontSize: 48, color: '#FFFFFF',
      }],
    }
    await loadSlide(canvas as any, slide, vi.fn())
    expect(canvas.add).toHaveBeenCalledTimes(1)
    expect(canvas.objects[0].text).toBe('Hello World')
    expect(canvas.objects[0].type).toBe('i-text')
  })

  test('converts percentage x/y to pixel coordinates for text', async () => {
    const canvas = makeMockCanvas()
    const slide: Slide = {
      id: 's1', label: 'Test', background: '#000000',
      elements: [{ id: 'e1', type: 'text', x: 10, y: 20, w: 80, h: 30, zIndex: 1, content: 'Hi' }],
    }
    await loadSlide(canvas as any, slide, vi.fn())
    // 10% of 1920 = 192, 20% of 1080 = 216
    expect(canvas.objects[0].left).toBeCloseTo(192, 0)
    expect(canvas.objects[0].top).toBeCloseTo(216, 0)
  })

  test('calls getImageUrl for image elements', async () => {
    const canvas = makeMockCanvas()
    const getImageUrl = vi.fn().mockResolvedValue('https://cdn.example.com/img.png')
    const slide: Slide = {
      id: 's1', label: 'Test', background: '#000000',
      elements: [{ id: 'e1', type: 'image', x: 0, y: 0, w: 50, h: 50, zIndex: 1, storageKey: 'deck/abc.png' }],
    }
    await loadSlide(canvas as any, slide, getImageUrl)
    expect(getImageUrl).toHaveBeenCalledWith('deck/abc.png')
  })

  test('adds a Rect object for shape elements', async () => {
    const canvas = makeMockCanvas()
    const slide: Slide = {
      id: 's1', label: 'Test', background: '#000000',
      elements: [{ id: 'e1', type: 'shape', x: 5, y: 5, w: 20, h: 10, zIndex: 1, fill: '#FF4D00' }],
    }
    await loadSlide(canvas as any, slide, vi.fn())
    expect(canvas.objects[0].type).toBe('rect')
    expect(canvas.objects[0].fill).toBe('#FF4D00')
  })
})

describe('serializeCanvas', () => {
  test('converts pixel left/top to percentage coordinates', () => {
    const canvas = makeMockCanvas()
    canvas.objects.push({
      type: 'i-text', text: 'Test',
      left: 192,   // 10% of 1920
      top: 216,    // 20% of 1080
      width: 1536, // 80% of 1920
      scaleX: 1, scaleY: 1,
      _pid: 'e1', _pz: 1, _poriginal: 'Test',
    })
    const existingSlide: Slide = { id: 's1', label: 'Test', background: '#000000', elements: [] }
    const result = serializeCanvas(canvas as any, existingSlide)
    expect(result.elements[0].x).toBeCloseTo(10, 0)
    expect(result.elements[0].y).toBeCloseTo(20, 0)
    expect(result.elements[0].w).toBeCloseTo(80, 0)
  })

  test('preserves slide id and label', () => {
    const canvas = makeMockCanvas()
    const existingSlide: Slide = { id: 'my-slide', label: 'My Label', background: '#000', elements: [] }
    const result = serializeCanvas(canvas as any, existingSlide)
    expect(result.id).toBe('my-slide')
    expect(result.label).toBe('My Label')
  })

  test('extracts text content from IText objects', () => {
    const canvas = makeMockCanvas()
    canvas.objects.push({
      type: 'i-text', text: 'Modified text',
      left: 96, top: 54, width: 1728, scaleX: 1, scaleY: 1,
      fill: '#FFFFFF', fontSize: 48, fontFamily: 'archivo-black',
      _pid: 'e1', _pz: 1, _poriginal: 'Modified text',
    })
    const existingSlide: Slide = { id: 's1', label: 'Test', background: '#000', elements: [] }
    const result = serializeCanvas(canvas as any, existingSlide)
    expect(result.elements[0].content).toBe('Modified text')
    expect(result.elements[0].type).toBe('text')
  })

  test('returns empty elements for empty canvas', () => {
    const canvas = makeMockCanvas()
    const existingSlide: Slide = { id: 's1', label: 'Test', background: '#000', elements: [] }
    const result = serializeCanvas(canvas as any, existingSlide)
    expect(result.elements).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run lib/deck/__tests__/fabric-bridge.test.ts
```

Expected: all tests fail with "Cannot find module '../fabric-bridge'".

- [ ] **Step 3: Create `lib/deck/fabric-bridge.ts`**

```ts
import { IText, Rect, Image } from 'fabric'
import type { Canvas } from 'fabric'
import { randomUUID } from 'crypto'
import type { Slide, SlideElement } from './types'

function toPixels(pct: number, dimension: number): number {
  return (pct / 100) * dimension
}

function toPercent(pixels: number, dimension: number): number {
  return Math.round((pixels / dimension) * 10000) / 100
}

export async function loadSlide(
  canvas: Canvas,
  slide: Slide,
  getImageUrl: (storageKey: string) => Promise<string>
): Promise<void> {
  canvas.clear()
  canvas.setBackgroundColor(slide.background, () => canvas.renderAll())

  const W = canvas.getWidth()
  const H = canvas.getHeight()

  const sorted = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex)

  for (const el of sorted) {
    const left = toPixels(el.x, W)
    const top = toPixels(el.y, H)
    const width = toPixels(el.w, W)
    const height = toPixels(el.h, H)

    if (el.type === 'text') {
      const obj = new IText(el.content ?? '', {
        left,
        top,
        width,
        fontSize: el.fontSize ?? 32,
        fontFamily: el.fontFamily ?? 'inter',
        fill: el.color ?? '#FFFFFF',
        textAlign: el.textAlign ?? 'left',
        lineHeight: el.lineHeight ?? 1.2,
        editable: true,
      } as any)
      ;(obj as any)._pid = el.id
      ;(obj as any)._pz = el.zIndex
      ;(obj as any)._ptransform = el.textTransform
      ;(obj as any)._poriginal = el.content
      canvas.add(obj)
    } else if (el.type === 'shape') {
      const obj = new Rect({
        left,
        top,
        width,
        height,
        fill: el.fill ?? '#222222',
        stroke: el.borderColor,
        strokeWidth: el.borderWidth ?? 0,
        rx: el.borderRadius ?? 0,
        ry: el.borderRadius ?? 0,
      } as any)
      ;(obj as any)._pid = el.id
      ;(obj as any)._pz = el.zIndex
      canvas.add(obj)
    } else if (el.type === 'image' && el.storageKey) {
      const url = await getImageUrl(el.storageKey)
      const img = await Image.fromURL(url, { crossOrigin: 'anonymous' } as any)
      ;(img as any).set({ left, top, width, height })
      ;(img as any)._pid = el.id
      ;(img as any)._pz = el.zIndex
      ;(img as any)._psk = el.storageKey
      ;(img as any)._pof = el.objectFit
      canvas.add(img as any)
    }
  }

  canvas.renderAll()
}

export function serializeCanvas(canvas: Canvas, existingSlide: Slide): Slide {
  const W = canvas.getWidth()
  const H = canvas.getHeight()
  const objects = canvas.getObjects() as any[]

  const elements: SlideElement[] = objects.map((obj: any, i: number) => {
    const id: string = obj._pid ?? randomUUID()
    const zIndex: number = obj._pz ?? i
    const x = toPercent(obj.left ?? 0, W)
    const y = toPercent(obj.top ?? 0, H)
    const w = toPercent((obj.width ?? 100) * (obj.scaleX ?? 1), W)
    const h = toPercent((obj.height ?? 100) * (obj.scaleY ?? 1), H)

    if (obj.type === 'i-text' || obj.type === 'text') {
      return {
        id, type: 'text', x, y, w, h, zIndex,
        content: obj._poriginal ?? obj.text ?? '',
        fontSize: obj.fontSize,
        fontFamily: obj.fontFamily,
        color: obj.fill,
        textTransform: obj._ptransform,
        textAlign: obj.textAlign,
        lineHeight: obj.lineHeight,
      }
    } else if (obj.type === 'rect') {
      return {
        id, type: 'shape', x, y, w, h, zIndex,
        fill: obj.fill,
        borderColor: obj.stroke,
        borderWidth: obj.strokeWidth,
        borderRadius: obj.rx,
      }
    } else {
      return {
        id, type: 'image', x, y, w, h, zIndex,
        storageKey: obj._psk,
        objectFit: obj._pof,
      }
    }
  })

  return { ...existingSlide, elements }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run lib/deck/__tests__/fabric-bridge.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/deck/
git commit -m "feat: Fabric.js bridge for SlideData serialization/deserialization"
```

---

## Task 6: Save Deck API Route

**Files:**
- Create: `app/api/deck/[id]/save/route.ts`

- [ ] **Step 1: Create `app/api/deck/[id]/save/route.ts`**

```ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import type { SlideData } from '@/lib/deck/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const org = await db.org.findUnique({ where: { clerkOrgId: orgId } })
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const deck = await db.deck.findUnique({
    where: { id },
    include: { pitch: { select: { orgId: true } } },
  })
  if (!deck || deck.pitch.orgId !== org.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let slideData: SlideData
  try {
    const body = await req.json()
    slideData = body.slideData
    if (!Array.isArray(slideData)) throw new Error('Invalid slideData')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  await db.deck.update({
    where: { id },
    data: { slideData: slideData as unknown as object },
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/deck/
git commit -m "feat: POST /api/deck/[id]/save for auto-save"
```

---

## Task 7: Image Upload API Route

**Files:**
- Create: `app/api/deck/[id]/upload-image/route.ts`

- [ ] **Step 1: Create `app/api/deck/[id]/upload-image/route.ts`**

```ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { uploadFile, getDownloadUrl } from '@/lib/storage/r2'
import { randomUUID } from 'crypto'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const org = await db.org.findUnique({ where: { clerkOrgId: orgId } })
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const deck = await db.deck.findUnique({
    where: { id },
    include: { pitch: { select: { orgId: true } } },
  })
  if (!deck || deck.pitch.orgId !== org.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'png'
  const storageKey = `${org.id}/deck-images/${randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  await uploadFile(storageKey, buffer, file.type)
  const url = await getDownloadUrl(storageKey)

  return NextResponse.json({ storageKey, url })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/deck/
git commit -m "feat: POST /api/deck/[id]/upload-image for canvas image uploads"
```

---

## Task 8: Editor Toolbar Component

**Files:**
- Create: `components/editor/__tests__/editor-toolbar.test.tsx`
- Create: `components/editor/editor-toolbar.tsx`

- [ ] **Step 1: Write failing tests**

Create `components/editor/__tests__/editor-toolbar.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run components/editor/__tests__/editor-toolbar.test.tsx
```

Expected: all tests fail with "Cannot find module '../editor-toolbar'".

- [ ] **Step 3: Create `components/editor/editor-toolbar.tsx`**

```tsx
'use client'

type Tool = 'select' | 'text' | 'shape' | 'image'

interface EditorToolbarProps {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  saveStatus: 'saved' | 'saving' | 'error'
  onPublish: () => void
  isPublished: boolean
  pitchId: string
}

const STATUS_LABEL = {
  saved: 'SAVED',
  saving: 'SAVING...',
  error: 'SAVE FAILED',
}

export function EditorToolbar({
  activeTool, onToolChange, onUndo, onRedo, canUndo, canRedo,
  saveStatus, onPublish, isPublished,
}: EditorToolbarProps) {
  return (
    <div className="h-10 bg-[#0a0a0a] border-b-2 border-[#1a1a1a] flex items-center gap-1 px-3">
      {(['text', 'shape', 'image'] as Tool[]).map((tool) => (
        <button
          key={tool}
          aria-label={tool}
          onClick={() => onToolChange(tool)}
          className={`font-mono text-[8px] uppercase px-2 py-1 ${
            activeTool === tool
              ? 'bg-ko-orange text-black'
              : 'bg-[#1a1a1a] border border-[#333] text-[#888]'
          }`}
        >
          {tool}
        </button>
      ))}
      <div className="w-px h-5 bg-[#222] mx-1" />
      <button
        aria-label="undo"
        onClick={onUndo}
        disabled={!canUndo}
        className="font-mono text-[8px] uppercase px-2 py-1 bg-[#1a1a1a] border border-[#333] text-[#888] disabled:opacity-30"
      >
        ↩ UNDO
      </button>
      <button
        aria-label="redo"
        onClick={onRedo}
        disabled={!canRedo}
        className="font-mono text-[8px] uppercase px-2 py-1 bg-[#1a1a1a] border border-[#333] text-[#888] disabled:opacity-30"
      >
        ↪ REDO
      </button>
      <div className="flex-1" />
      <span
        className={`font-mono text-[7px] mr-3 ${
          saveStatus === 'error' ? 'text-red-500' : 'text-[#555]'
        }`}
      >
        {STATUS_LABEL[saveStatus]}
      </span>
      <button
        aria-label="publish"
        onClick={onPublish}
        className="font-mono text-[8px] uppercase px-3 py-1 bg-ko-orange text-black"
      >
        {isPublished ? 'PUBLISHED ✓' : 'PUBLISH →'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm tests pass**

```bash
npx vitest run components/editor/__tests__/editor-toolbar.test.tsx
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/editor/
git commit -m "feat: EditorToolbar component with tool selection, undo/redo, save status"
```

---

## Task 9: Slide Panel Component

**Files:**
- Create: `components/editor/__tests__/slide-panel.test.tsx`
- Create: `components/editor/slide-panel.tsx`

- [ ] **Step 1: Write failing tests**

Create `components/editor/__tests__/slide-panel.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run components/editor/__tests__/slide-panel.test.tsx
```

Expected: tests fail with "Cannot find module '../slide-panel'".

- [ ] **Step 3: Create `components/editor/slide-panel.tsx`**

```tsx
'use client'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Slide } from '@/lib/deck/types'

interface SlidePanelProps {
  slides: Slide[]
  currentIndex: number
  onSelect: (index: number) => void
  onReorder: (newSlides: Slide[]) => void
  onAdd: () => void
  onDelete: (index: number) => void
}

function SortableSlideItem({
  slide, index, isActive, onSelect, onDelete,
}: {
  slide: Slide
  index: number
  isActive: boolean
  onSelect: (i: number) => void
  onDelete: (i: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: slide.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border p-1 ${isActive ? 'border-ko-orange' : 'border-[#222]'}`}
    >
      <div className="flex items-center gap-1 mb-1">
        <span
          {...attributes}
          {...listeners}
          className="text-[#444] cursor-grab text-[10px] select-none"
        >
          ⠿
        </span>
        <span className="font-mono text-[7px] text-[#555] flex-1">
          {String(index + 1).padStart(2, '0')}
        </span>
        <button
          aria-label={`delete slide ${index + 1}`}
          className="font-mono text-[7px] text-[#444] hover:text-red-500"
          onClick={(e) => { e.stopPropagation(); onDelete(index) }}
        >
          ✕
        </button>
      </div>
      <div
        className="h-14 relative overflow-hidden"
        style={{ backgroundColor: slide.background }}
        onClick={() => onSelect(index)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(index)}
      >
        <span className="font-mono text-[5px] text-ko-orange absolute top-1 left-1 pointer-events-none">
          {slide.label}
        </span>
      </div>
    </div>
  )
}

export function SlidePanel({ slides, currentIndex, onSelect, onReorder, onAdd, onDelete }: SlidePanelProps) {
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = slides.findIndex((s) => s.id === active.id)
    const newIdx = slides.findIndex((s) => s.id === over.id)
    onReorder(arrayMove(slides, oldIdx, newIdx))
  }

  return (
    <div className="w-[120px] bg-[#0a0a0a] border-r-2 border-[#1a1a1a] flex flex-col">
      <div className="p-2 border-b border-[#1a1a1a]">
        <p className="font-mono text-[8px] uppercase tracking-tight2 text-ko-orange">// Slides</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {slides.map((slide, i) => (
              <SortableSlideItem
                key={slide.id}
                slide={slide}
                index={i}
                isActive={i === currentIndex}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </SortableContext>
        </DndContext>
        <button
          className="w-full border border-dashed border-[#333] text-[#444] font-mono text-[8px] py-2 hover:border-[#555] hover:text-[#666]"
          onClick={onAdd}
        >
          + ADD SLIDE
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm tests pass**

```bash
npx vitest run components/editor/__tests__/slide-panel.test.tsx
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/editor/
git commit -m "feat: SlidePanel with dnd-kit sortable and slide CRUD actions"
```

---

## Task 10: Properties Panel Component

**Files:**
- Create: `components/editor/__tests__/properties-panel.test.tsx`
- Create: `components/editor/properties-panel.tsx`

- [ ] **Step 1: Write failing tests**

Create `components/editor/__tests__/properties-panel.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { PropertiesPanel } from '../properties-panel'
import type { SlideElement } from '@/lib/deck/types'

const textElement: SlideElement = {
  id: 'e1', type: 'text',
  x: 5, y: 5, w: 90, h: 20,
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
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run components/editor/__tests__/properties-panel.test.tsx
```

Expected: tests fail with "Cannot find module '../properties-panel'".

- [ ] **Step 3: Create `components/editor/properties-panel.tsx`**

```tsx
'use client'
import type { SlideElement } from '@/lib/deck/types'

interface PropertiesPanelProps {
  element: SlideElement | null
  onUpdate: (changes: Partial<SlideElement>) => void
  onDelete: () => void
}

export function PropertiesPanel({ element, onUpdate, onDelete }: PropertiesPanelProps) {
  if (!element) {
    return (
      <div className="w-40 bg-[#0a0a0a] border-l-2 border-[#1a1a1a] flex flex-col p-3">
        <p className="font-mono text-[8px] uppercase tracking-tight2 text-ko-orange mb-4">// Properties</p>
        <p className="font-mono text-[8px] text-[#555]">No element selected</p>
      </div>
    )
  }

  return (
    <div className="w-40 bg-[#0a0a0a] border-l-2 border-[#1a1a1a] flex flex-col">
      <div className="p-2 border-b border-[#1a1a1a]">
        <p className="font-mono text-[8px] uppercase tracking-tight2 text-ko-orange">// Properties</p>
      </div>
      <div className="p-3 space-y-4 flex-1 overflow-y-auto">
        {element.type === 'text' && (
          <>
            <div>
              <label className="font-mono text-[7px] uppercase text-[#555] block mb-1">Font</label>
              <select
                className="w-full bg-[#111] border border-[#333] text-[#aaa] font-mono text-[8px] p-1"
                value={element.fontFamily ?? 'archivo-black'}
                onChange={(e) => onUpdate({ fontFamily: e.target.value as SlideElement['fontFamily'] })}
              >
                <option value="archivo-black">Archivo Black</option>
                <option value="space-mono">Space Mono</option>
                <option value="inter">Inter</option>
              </select>
            </div>
            <div>
              <label className="font-mono text-[7px] uppercase text-[#555] block mb-1">Size</label>
              <input
                type="number"
                className="w-full bg-[#111] border border-[#333] text-[#aaa] font-mono text-[8px] p-1"
                value={element.fontSize ?? 32}
                onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="font-mono text-[7px] uppercase text-[#555] block mb-1">Color</label>
              <input
                type="color"
                className="w-full h-7 cursor-pointer"
                value={element.color ?? '#FFFFFF'}
                onChange={(e) => onUpdate({ color: e.target.value })}
              />
            </div>
            <div>
              <label className="font-mono text-[7px] uppercase text-[#555] block mb-1">Transform</label>
              <div className="flex gap-1">
                <button
                  className={`font-mono text-[7px] px-2 py-1 ${element.textTransform === 'uppercase' ? 'bg-ko-orange text-black' : 'bg-[#111] border border-[#333] text-[#888]'}`}
                  onClick={() => onUpdate({ textTransform: 'uppercase' })}
                >
                  AA
                </button>
                <button
                  className={`font-mono text-[7px] px-2 py-1 ${element.textTransform !== 'uppercase' ? 'bg-ko-orange text-black' : 'bg-[#111] border border-[#333] text-[#888]'}`}
                  onClick={() => onUpdate({ textTransform: 'none' })}
                >
                  Aa
                </button>
              </div>
            </div>
          </>
        )}
        <div>
          <label className="font-mono text-[7px] uppercase text-[#555] block mb-2">Position</label>
          <div className="grid grid-cols-2 gap-1">
            {(['x', 'y', 'w', 'h'] as const).map((prop) => (
              <div key={prop}>
                <label className="font-mono text-[6px] text-[#444] block">{prop.toUpperCase()}</label>
                <input
                  type="number"
                  className="w-full bg-[#111] border border-[#333] text-[#aaa] font-mono text-[7px] p-1"
                  value={Math.round(element[prop])}
                  onChange={(e) => onUpdate({ [prop]: Number(e.target.value) })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="p-3 border-t border-[#1a1a1a]">
        <button
          aria-label="delete element"
          className="w-full border border-[#333] text-[#666] font-mono text-[7px] uppercase py-2 hover:border-red-800 hover:text-red-600"
          onClick={onDelete}
        >
          Delete Element
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm tests pass**

```bash
npx vitest run components/editor/__tests__/properties-panel.test.tsx
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/editor/
git commit -m "feat: PropertiesPanel for selected canvas element editing"
```

---

## Task 11: Canvas Area Component

**Files:**
- Create: `components/editor/canvas-area.tsx`

The canvas uses Fabric.js which requires DOM APIs. Tests for this component verify rendering only — Fabric initialization happens in a `useEffect` that is bypassed by mocking.

- [ ] **Step 1: Create `components/editor/canvas-area.tsx`**

```tsx
'use client'
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import type { Canvas } from 'fabric'
import type { Slide, SlideElement } from '@/lib/deck/types'
import { loadSlide, serializeCanvas } from '@/lib/deck/fabric-bridge'

export interface CanvasAreaRef {
  updateElement: (id: string, changes: Partial<SlideElement>) => void
  addTextElement: () => void
  addShapeElement: () => void
  triggerImageUpload: () => void
}

interface CanvasAreaProps {
  slide: Slide
  imageUrls: Record<string, string>
  deckId: string
  onSlideChange: (slide: Slide) => void
  onSelectionChange: (elementId: string | null) => void
  onImageUploaded: (storageKey: string, url: string) => void
}

function toPixels(pct: number, dimension: number): number {
  return (pct / 100) * dimension
}

export const CanvasArea = forwardRef<CanvasAreaRef, CanvasAreaProps>(function CanvasArea(
  { slide, imageUrls, deckId, onSlideChange, onSelectionChange, onImageUploaded },
  ref
) {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const currentSlideIdRef = useRef(slide.id)
  const slideRef = useRef(slide)
  slideRef.current = slide
  const imageUrlsRef = useRef(imageUrls)
  imageUrlsRef.current = imageUrls
  const fileInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    updateElement(id: string, changes: Partial<SlideElement>) {
      const fc = fabricRef.current
      if (!fc) return
      const obj = (fc.getObjects() as any[]).find((o) => o._pid === id)
      if (!obj) return
      if (changes.content !== undefined) obj.set('text', changes.content)
      if (changes.fontSize !== undefined) obj.set('fontSize', changes.fontSize)
      if (changes.fontFamily !== undefined) obj.set('fontFamily', changes.fontFamily)
      if (changes.color !== undefined) obj.set('fill', changes.color)
      if (changes.x !== undefined) obj.set('left', toPixels(changes.x, fc.getWidth()))
      if (changes.y !== undefined) obj.set('top', toPixels(changes.y, fc.getHeight()))
      if (changes.w !== undefined) obj.set('width', toPixels(changes.w, fc.getWidth()))
      if (changes.h !== undefined) obj.set('height', toPixels(changes.h, fc.getHeight()))
      fc.renderAll()
    },
    addTextElement() {
      const fc = fabricRef.current
      if (!fc) return
      import('fabric').then(({ IText }) => {
        const obj = new IText('New Text', {
          left: fc.getWidth() * 0.1,
          top: fc.getHeight() * 0.4,
          width: fc.getWidth() * 0.8,
          fontSize: 48,
          fill: '#FFFFFF',
          fontFamily: 'Archivo Black',
          editable: true,
        } as any)
        ;(obj as any)._pid = crypto.randomUUID()
        ;(obj as any)._pz = fc.getObjects().length
        fc.add(obj)
        fc.setActiveObject(obj)
        fc.renderAll()
        onSlideChange(serializeCanvas(fc, slideRef.current))
      })
    },
    addShapeElement() {
      const fc = fabricRef.current
      if (!fc) return
      import('fabric').then(({ Rect }) => {
        const obj = new Rect({
          left: fc.getWidth() * 0.1,
          top: fc.getHeight() * 0.1,
          width: fc.getWidth() * 0.2,
          height: fc.getHeight() * 0.2,
          fill: '#FF4D00',
        } as any)
        ;(obj as any)._pid = crypto.randomUUID()
        ;(obj as any)._pz = fc.getObjects().length
        fc.add(obj)
        fc.setActiveObject(obj)
        fc.renderAll()
        onSlideChange(serializeCanvas(fc, slideRef.current))
      })
    },
    triggerImageUpload() {
      fileInputRef.current?.click()
    },
  }))

  useEffect(() => {
    if (!canvasElRef.current) return
    let disposed = false

    import('fabric').then(({ Canvas }) => {
      if (disposed || !canvasElRef.current) return
      const container = canvasElRef.current.parentElement!
      const w = container.clientWidth
      const h = Math.round(w * (9 / 16))
      const fc = new Canvas(canvasElRef.current, { width: w, height: h })
      fabricRef.current = fc

      loadSlide(fc, slideRef.current, (k) =>
        Promise.resolve(imageUrlsRef.current[k] ?? '')
      )

      fc.on('object:modified', () => {
        if (fabricRef.current) onSlideChange(serializeCanvas(fabricRef.current, slideRef.current))
      })
      fc.on('text:changed', () => {
        if (fabricRef.current) onSlideChange(serializeCanvas(fabricRef.current, slideRef.current))
      })
      fc.on('selection:created', () => {
        const obj = (fabricRef.current as any)?.getActiveObject()
        onSelectionChange((obj as any)?._pid ?? null)
      })
      fc.on('selection:cleared', () => onSelectionChange(null))
    })

    return () => {
      disposed = true
      fabricRef.current?.dispose()
      fabricRef.current = null
    }
  }, [])

  useEffect(() => {
    if (currentSlideIdRef.current === slide.id) return
    currentSlideIdRef.current = slide.id
    if (fabricRef.current) {
      loadSlide(fabricRef.current, slide, (k) =>
        Promise.resolve(imageUrlsRef.current[k] ?? '')
      )
    }
  }, [slide.id])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/deck/${deckId}/upload-image`, { method: 'POST', body: formData })
    if (!res.ok) return
    const { storageKey, url } = await res.json()
    onImageUploaded(storageKey, url)

    const fc = fabricRef.current
    if (!fc) return
    import('fabric').then(({ Image }) => {
      Image.fromURL(url, { crossOrigin: 'anonymous' } as any).then((img: any) => {
        img.set({ left: fc.getWidth() * 0.1, top: fc.getHeight() * 0.1, width: fc.getWidth() * 0.4, height: fc.getHeight() * 0.4 })
        ;(img as any)._pid = crypto.randomUUID()
        ;(img as any)._pz = fc.getObjects().length
        ;(img as any)._psk = storageKey
        fc.add(img)
        fc.renderAll()
        onSlideChange(serializeCanvas(fc, slideRef.current))
      })
    })
    e.target.value = ''
  }

  return (
    <div className="flex-1 bg-[#0d0d0d] flex items-center justify-center p-5">
      <div className="w-full max-w-[900px]" style={{ aspectRatio: '16/9' }}>
        <canvas ref={canvasElRef} />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
})
```

- [ ] **Step 2: Commit**

```bash
git add components/editor/canvas-area.tsx
git commit -m "feat: CanvasArea wraps Fabric.js canvas with slide load/serialize and image upload"
```

---

## Task 12: Deck Editor Top-Level Component

**Files:**
- Create: `components/editor/__tests__/deck-editor.test.tsx`
- Create: `components/editor/deck-editor.tsx`

- [ ] **Step 1: Write failing tests**

Create `components/editor/__tests__/deck-editor.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run components/editor/__tests__/deck-editor.test.tsx
```

Expected: tests fail with "Cannot find module '../deck-editor'".

- [ ] **Step 3: Create `components/editor/deck-editor.tsx`**

```tsx
'use client'
import { useState, useCallback, useRef, useEffect, forwardRef } from 'react'
import dynamic from 'next/dynamic'
import type { SlideData, Slide, SlideElement } from '@/lib/deck/types'
import { EditorToolbar } from './editor-toolbar'
import { SlidePanel } from './slide-panel'
import { PropertiesPanel } from './properties-panel'
import type { CanvasAreaRef } from './canvas-area'
import { randomUUID } from 'crypto'

const CanvasArea = dynamic(
  () => import('./canvas-area').then((m) => m.CanvasArea),
  { ssr: false }
) as any

type Tool = 'select' | 'text' | 'shape' | 'image'
type SaveStatus = 'saved' | 'saving' | 'error'

interface DeckEditorProps {
  deckId: string
  pitchId: string
  initialSlides: SlideData
  shareToken: string
  isPublished: boolean
  imageUrls: Record<string, string>
}

export function DeckEditor({
  deckId, pitchId, initialSlides, shareToken, isPublished: initialIsPublished, imageUrls: initialImageUrls,
}: DeckEditorProps) {
  const [slides, setSlides] = useState<SlideData>(initialSlides)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [isPublished, setIsPublished] = useState(initialIsPublished)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>(initialImageUrls)

  const canvasRef = useRef<CanvasAreaRef>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const historyRef = useRef<SlideData[]>([JSON.parse(JSON.stringify(initialSlides))])
  const historyIndexRef = useRef(0)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const pushHistory = useCallback((newSlides: SlideData) => {
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1)
    const next = [...trimmed, JSON.parse(JSON.stringify(newSlides))].slice(-50)
    historyRef.current = next
    historyIndexRef.current = next.length - 1
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(false)
  }, [])

  const scheduleSave = useCallback((newSlides: SlideData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/deck/${deckId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slideData: newSlides }),
        })
        if (!res.ok) throw new Error('Save failed')
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 1000)
  }, [deckId])

  const updateSlides = useCallback((newSlides: SlideData) => {
    setSlides(newSlides)
    pushHistory(newSlides)
    scheduleSave(newSlides)
  }, [pushHistory, scheduleSave])

  const handleSlideChange = useCallback((updatedSlide: Slide) => {
    setSlides((prev) => {
      const next = prev.map((s) => (s.id === updatedSlide.id ? updatedSlide : s))
      pushHistory(next)
      scheduleSave(next)
      return next
    })
  }, [pushHistory, scheduleSave])

  const handleElementUpdate = useCallback((changes: Partial<SlideElement>) => {
    if (!selectedElementId) return
    canvasRef.current?.updateElement(selectedElementId, changes)
    setSlides((prev) => {
      const next = prev.map((slide, i) => {
        if (i !== currentIndex) return slide
        return {
          ...slide,
          elements: slide.elements.map((el) =>
            el.id === selectedElementId ? { ...el, ...changes } : el
          ),
        }
      })
      pushHistory(next)
      scheduleSave(next)
      return next
    })
  }, [selectedElementId, currentIndex, pushHistory, scheduleSave])

  const handleElementDelete = useCallback(() => {
    if (!selectedElementId) return
    setSlides((prev) => {
      const next = prev.map((slide, i) => {
        if (i !== currentIndex) return slide
        return { ...slide, elements: slide.elements.filter((el) => el.id !== selectedElementId) }
      })
      pushHistory(next)
      scheduleSave(next)
      return next
    })
    setSelectedElementId(null)
  }, [selectedElementId, currentIndex, pushHistory, scheduleSave])

  const handleAddSlide = useCallback(() => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      label: `Slide ${slides.length + 1}`,
      background: slides[0]?.background ?? '#000000',
      elements: [],
    }
    updateSlides([...slides, newSlide])
    setCurrentIndex(slides.length)
  }, [slides, updateSlides])

  const handleDeleteSlide = useCallback((index: number) => {
    if (slides.length <= 1) return
    const next = slides.filter((_, i) => i !== index)
    updateSlides(next)
    setCurrentIndex((prev) => Math.min(prev, next.length - 1))
  }, [slides, updateSlides])

  const handleToolChange = useCallback((tool: Tool) => {
    setActiveTool(tool)
    if (tool === 'text') canvasRef.current?.addTextElement()
    if (tool === 'shape') canvasRef.current?.addShapeElement()
    if (tool === 'image') canvasRef.current?.triggerImageUpload()
  }, [])

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current--
    const snapshot = historyRef.current[historyIndexRef.current]
    setSlides(snapshot)
    scheduleSave(snapshot)
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(true)
  }, [scheduleSave])

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current++
    const snapshot = historyRef.current[historyIndexRef.current]
    setSlides(snapshot)
    scheduleSave(snapshot)
    setCanUndo(true)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [scheduleSave])

  const handlePublish = useCallback(async () => {
    const res = await fetch(`/api/pitch/${pitchId}/publish`, { method: 'POST' })
    if (res.ok) setIsPublished(true)
  }, [pitchId])

  const selectedElement =
    selectedElementId != null
      ? slides[currentIndex]?.elements.find((e) => e.id === selectedElementId) ?? null
      : null

  return (
    <div className="flex flex-col h-screen bg-ko-black">
      <EditorToolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        saveStatus={saveStatus}
        onPublish={handlePublish}
        isPublished={isPublished}
        pitchId={pitchId}
      />
      <div className="flex flex-1 overflow-hidden">
        <SlidePanel
          slides={slides}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
          onReorder={updateSlides}
          onAdd={handleAddSlide}
          onDelete={handleDeleteSlide}
        />
        <CanvasArea
          ref={canvasRef}
          slide={slides[currentIndex]}
          imageUrls={imageUrls}
          deckId={deckId}
          onSlideChange={handleSlideChange}
          onSelectionChange={setSelectedElementId}
          onImageUploaded={(storageKey, url) =>
            setImageUrls((prev) => ({ ...prev, [storageKey]: url }))
          }
        />
        <PropertiesPanel
          element={selectedElement}
          onUpdate={handleElementUpdate}
          onDelete={handleElementDelete}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm tests pass**

```bash
npx vitest run components/editor/__tests__/deck-editor.test.tsx
```

Expected: all 5 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/editor/
git commit -m "feat: DeckEditor top-level component with history, auto-save, and slide management"
```

---

## Task 13: Editor Page Route

**Files:**
- Create: `app/(app)/pitch/[id]/editor/page.tsx`
- Create: `app/(app)/pitch/[id]/editor/editor-client.tsx`

- [ ] **Step 1: Create `app/(app)/pitch/[id]/editor/editor-client.tsx`**

```tsx
'use client'
import { DeckEditor } from '@/components/editor/deck-editor'
import type { SlideData } from '@/lib/deck/types'

interface EditorClientProps {
  deckId: string
  pitchId: string
  initialSlides: SlideData
  shareToken: string
  isPublished: boolean
  imageUrls: Record<string, string>
}

export function EditorClient(props: EditorClientProps) {
  return <DeckEditor {...props} />
}
```

- [ ] **Step 2: Create `app/(app)/pitch/[id]/editor/page.tsx`**

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { getDownloadUrl } from '@/lib/storage/r2'
import { EditorClient } from './editor-client'
import type { SlideData, SlideElement } from '@/lib/deck/types'

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth()
  if (!orgId) redirect('/sign-in')

  const org = await db.org.findUnique({ where: { clerkOrgId: orgId } })
  if (!org) redirect('/sign-in')

  const { id } = await params
  const pitch = await db.pitch.findUnique({
    where: { id, orgId: org.id },
    include: { theme: true, deck: true },
  })
  if (!pitch || !pitch.deck) notFound()
  if (!pitch.deck.slideData) redirect(`/pitch/${id}`)

  const slides = pitch.deck.slideData as unknown as SlideData

  // Pre-generate signed URLs for all image elements
  const allImageKeys = slides
    .flatMap((s) => s.elements)
    .filter((el): el is SlideElement & { storageKey: string } =>
      el.type === 'image' && !!el.storageKey
    )
    .map((el) => el.storageKey)

  const imageUrlEntries = await Promise.all(
    allImageKeys.map(async (key) => [key, await getDownloadUrl(key)] as const)
  )
  const imageUrls = Object.fromEntries(imageUrlEntries)

  return (
    <EditorClient
      deckId={pitch.deck.id}
      pitchId={pitch.id}
      initialSlides={slides}
      shareToken={pitch.deck.shareToken}
      isPublished={!!pitch.deck.publishedAt}
      imageUrls={imageUrls}
    />
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/pitch/[id]/editor/"
git commit -m "feat: editor page route with pre-loaded slide data and signed image URLs"
```

---

## Task 14: Update Pitch Detail Page

**Files:**
- Modify: `app/(app)/pitch/[id]/page.tsx`

- [ ] **Step 1: Update `app/(app)/pitch/[id]/page.tsx`**

Replace the entire file:

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db/client'
import { GenerationProgress } from '@/components/pitch/generation-progress'
import { PublishButton } from './publish-button'
import { SlideView } from '@/components/deck/slide-view'
import type { SlideData } from '@/lib/deck/types'

export default async function PitchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth()
  if (!orgId) redirect('/sign-in')

  const org = await db.org.findUnique({ where: { clerkOrgId: orgId } })
  if (!org) redirect('/sign-in')

  const { id } = await params
  const pitch = await db.pitch.findUnique({
    where: { id, orgId: org.id },
    include: { theme: true, deck: true },
  })
  if (!pitch) notFound()

  const slides = pitch.deck?.slideData
    ? (pitch.deck.slideData as unknown as SlideData)
    : null

  return (
    <div className="p-6">
      <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange mb-2">// Pitch Deck</p>
      <div className="flex items-end justify-between mb-8 border-b-2 border-[#222] pb-4">
        <h1 className="font-archivo text-5xl uppercase tracking-tight4 leading-brutalist">
          {pitch.theme.name}
        </h1>
        <div className="flex items-center gap-3">
          {pitch.deck && pitch.status === 'DONE' && (
            <Link
              href={`/pitch/${pitch.id}/editor`}
              className="font-mono text-[10px] uppercase bg-ko-orange text-black px-4 py-2"
            >
              Open Editor →
            </Link>
          )}
          {pitch.deck && (
            <PublishButton
              shareToken={pitch.deck.shareToken}
              isPublished={!!pitch.deck.publishedAt}
            />
          )}
        </div>
      </div>

      <GenerationProgress
        pitchId={pitch.id}
        initialStatus={pitch.status as 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'}
      />

      {slides && <SlideView slides={slides} />}
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/pitch/[id]/page.tsx"
git commit -m "feat: add Open Editor link on pitch detail page"
```

---

## Task 15: PPTX Export

**Files:**
- Create: `lib/export/__tests__/pptx.test.ts`
- Create: `lib/export/pptx.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/export/__tests__/pptx.test.ts`:

```ts
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { generatePptx, pctToInches } from '../pptx'
import type { SlideData } from '@/lib/deck/types'

const mockAddText = vi.fn()
const mockAddShape = vi.fn()
const mockAddImage = vi.fn()
const mockWrite = vi.fn(async () => Buffer.from('fake-pptx-binary'))
const mockAddSlide = vi.fn(() => ({
  addText: mockAddText,
  addShape: mockAddShape,
  addImage: mockAddImage,
  background: null,
}))

vi.mock('pptxgenjs', () => ({
  default: vi.fn(() => ({
    layout: '',
    addSlide: mockAddSlide,
    write: mockWrite,
  })),
}))

const testSlideData: SlideData = [
  {
    id: 'slide-1',
    label: 'Executive Summary',
    background: '#000000',
    elements: [
      {
        id: 'el-1', type: 'text',
        x: 5, y: 5, w: 90, h: 20, zIndex: 1,
        content: 'Test heading', fontSize: 48,
        color: '#FFFFFF', textAlign: 'left',
      },
      {
        id: 'el-2', type: 'shape',
        x: 0, y: 0, w: 100, h: 5, zIndex: 0,
        fill: '#FF4D00',
      },
    ],
  },
]

describe('pctToInches', () => {
  test('converts 5% of 13.33 inches to ~0.67', () => {
    expect(pctToInches(5, 13.33)).toBeCloseTo(0.67, 1)
  })

  test('converts 100% to full dimension', () => {
    expect(pctToInches(100, 13.33)).toBeCloseTo(13.33, 1)
  })
})

describe('generatePptx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWrite.mockResolvedValue(Buffer.from('fake-pptx-binary'))
    mockAddSlide.mockReturnValue({ addText: mockAddText, addShape: mockAddShape, addImage: mockAddImage, background: null })
  })

  test('returns a Buffer', async () => {
    const result = await generatePptx(testSlideData, vi.fn())
    expect(result).toBeInstanceOf(Buffer)
  })

  test('calls addSlide once per slide', async () => {
    await generatePptx(testSlideData, vi.fn())
    expect(mockAddSlide).toHaveBeenCalledTimes(1)
  })

  test('calls addText for text elements', async () => {
    await generatePptx(testSlideData, vi.fn())
    expect(mockAddText).toHaveBeenCalledWith(
      'Test heading',
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
    )
  })

  test('calls addShape for shape elements', async () => {
    await generatePptx(testSlideData, vi.fn())
    expect(mockAddShape).toHaveBeenCalled()
  })

  test('converts x percentage to correct inches for text element', async () => {
    await generatePptx(testSlideData, vi.fn())
    // el-1: x=5%, 5/100 * 13.33 = 0.6665
    const call = mockAddText.mock.calls[0]
    expect(call[1].x).toBeCloseTo(0.67, 1)
  })
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run lib/export/__tests__/pptx.test.ts
```

Expected: all tests fail with "Cannot find module '../pptx'".

- [ ] **Step 3: Create `lib/export/pptx.ts`**

```ts
import PptxGenJS from 'pptxgenjs'
import type { SlideData } from '@/lib/deck/types'

const SLIDE_W = 13.33
const SLIDE_H = 7.5

export function pctToInches(pct: number, total: number): number {
  return Math.round((pct / 100) * total * 1000) / 1000
}

export async function generatePptx(
  slideData: SlideData,
  getImageBuffer: (storageKey: string) => Promise<Buffer>
): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'

  for (const slide of slideData) {
    const s = pptx.addSlide()
    s.background = { color: slide.background.replace('#', '') }

    for (const el of slide.elements) {
      const x = pctToInches(el.x, SLIDE_W)
      const y = pctToInches(el.y, SLIDE_H)
      const w = pctToInches(el.w, SLIDE_W)
      const h = pctToInches(el.h, SLIDE_H)

      if (el.type === 'text') {
        s.addText(el.content ?? '', {
          x, y, w, h,
          fontSize: el.fontSize ? Math.round(el.fontSize * 0.75) : 24,
          color: (el.color ?? '#FFFFFF').replace('#', ''),
          bold: (el.fontWeight ?? 400) >= 700,
          align: el.textAlign ?? 'left',
        })
      } else if (el.type === 'shape') {
        s.addShape('rect' as any, {
          x, y, w, h,
          fill: { color: (el.fill ?? '#222222').replace('#', '') },
          line: el.borderColor
            ? { color: el.borderColor.replace('#', ''), width: el.borderWidth ?? 1 }
            : { color: 'transparent', width: 0 },
        })
      } else if (el.type === 'image' && el.storageKey) {
        try {
          const buf = await getImageBuffer(el.storageKey)
          s.addImage({
            data: `image/jpeg;base64,${buf.toString('base64')}`,
            x, y, w, h,
          })
        } catch {
          // Skip images that fail to fetch
        }
      }
    }
  }

  return pptx.write({ outputType: 'nodebuffer' }) as Promise<Buffer>
}
```

- [ ] **Step 4: Run to confirm tests pass**

```bash
npx vitest run lib/export/__tests__/pptx.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/export/
git commit -m "feat: pptxgenjs export — converts SlideData to PPTX buffer"
```

---

## Task 16: PDF Export and Export API Route

**Files:**
- Create: `lib/export/__tests__/pdf.test.ts`
- Create: `lib/export/pdf.ts`
- Create: `app/api/pitch/export/route.ts`

- [ ] **Step 1: Write failing PDF smoke test**

Create `lib/export/__tests__/pdf.test.ts`:

```ts
import { describe, test, expect, vi } from 'vitest'
import { generatePdf } from '../pdf'

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(async () => ({
      newPage: vi.fn(async () => ({
        goto: vi.fn(),
        pdf: vi.fn(async () => Buffer.from('fake-pdf-bytes')),
      })),
      close: vi.fn(),
    })),
  },
}))

describe('generatePdf', () => {
  test('returns a Buffer', async () => {
    const result = await generatePdf('http://localhost:3000/deck/tok-abc?print=1')
    expect(result).toBeInstanceOf(Buffer)
  })

  test('launches puppeteer and navigates to the given URL', async () => {
    const puppeteer = await import('puppeteer')
    const launchSpy = puppeteer.default.launch as ReturnType<typeof vi.fn>
    launchSpy.mockClear()

    await generatePdf('http://localhost:3000/deck/tok-abc?print=1')

    expect(launchSpy).toHaveBeenCalled()
    const browser = await launchSpy.mock.results[0].value
    const page = await browser.newPage()
    expect(page.goto).toHaveBeenCalledWith(
      'http://localhost:3000/deck/tok-abc?print=1',
      expect.objectContaining({ waitUntil: 'networkidle0' })
    )
  })

  test('calls page.pdf with correct dimensions', async () => {
    const puppeteer = await import('puppeteer')
    const launchSpy = puppeteer.default.launch as ReturnType<typeof vi.fn>
    await generatePdf('http://localhost:3000/deck/tok-abc?print=1')
    const browser = await launchSpy.mock.results[launchSpy.mock.results.length - 1].value
    const page = await browser.newPage()
    expect(page.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ width: '1920px', height: '1080px', printBackground: true })
    )
  })
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run lib/export/__tests__/pdf.test.ts
```

Expected: tests fail with "Cannot find module '../pdf'".

- [ ] **Step 3: Create `lib/export/pdf.ts`**

```ts
import puppeteer from 'puppeteer'

export async function generatePdf(deckUrl: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.goto(deckUrl, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      width: '1920px',
      height: '1080px',
      printBackground: true,
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
```

- [ ] **Step 4: Run to confirm tests pass**

```bash
npx vitest run lib/export/__tests__/pdf.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 5: Create `app/api/pitch/export/route.ts`**

```ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { generatePptx } from '@/lib/export/pptx'
import { generatePdf } from '@/lib/export/pdf'
import { getDownloadUrl } from '@/lib/storage/r2'
import type { SlideData } from '@/lib/deck/types'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  const format = req.nextUrl.searchParams.get('format')

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (format !== 'pdf' && format !== 'pptx') {
    return NextResponse.json({ error: 'format must be pdf or pptx' }, { status: 400 })
  }

  const org = await db.org.findUnique({ where: { clerkOrgId: orgId } })
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const pitch = await db.pitch.findUnique({
    where: { id, orgId: org.id },
    include: { deck: true },
  })
  if (!pitch || !pitch.deck) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!pitch.deck.publishedAt) {
    return NextResponse.json({ error: 'Publish the deck before exporting' }, { status: 400 })
  }
  if (!pitch.deck.slideData) {
    return NextResponse.json({ error: 'Deck not initialized' }, { status: 400 })
  }

  const slideData = pitch.deck.slideData as unknown as SlideData

  if (format === 'pptx') {
    const getImageBuffer = async (storageKey: string): Promise<Buffer> => {
      const url = await getDownloadUrl(storageKey)
      const res = await fetch(url)
      return Buffer.from(await res.arrayBuffer())
    }
    const buffer = await generatePptx(slideData, getImageBuffer)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': 'attachment; filename="pitch.pptx"',
      },
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL not configured' }, { status: 500 })

  const deckUrl = `${appUrl}/deck/${pitch.deck.shareToken}?print=1`
  const buffer = await generatePdf(deckUrl)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="pitch.pdf"',
    },
  })
}
```

- [ ] **Step 6: Add `NEXT_PUBLIC_APP_URL` to `.env.local`**

Open `.env.local` and add:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 7: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 8: Type check**

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add lib/export/ app/api/pitch/export/ .env.local
git commit -m "feat: PDF and PPTX export — Puppeteer render and pptxgenjs pipeline"
```

---

## Self-Review

After writing this plan, checking it against the spec:

| Spec requirement | Task |
|---|---|
| Fabric.js free canvas editor | Tasks 5, 11, 12 |
| Slide thumbnails + drag-to-reorder | Task 9 |
| Add / delete slides | Task 12 |
| Add text, image, shape | Task 11 |
| Properties panel (font, color, size, position) | Task 10 |
| Undo/redo | Task 12 |
| Auto-save (debounced 1s) | Task 12 |
| Image upload to R2 | Task 7, 11 |
| slideData typed schema | Tasks 1, 2 |
| initSlideData initializer | Task 2 |
| Wire initializer into pitch generation | Task 3 |
| Update public deck view to render SlideData | Task 4 |
| Print layout for Puppeteer | Task 4 |
| Save deck API route | Task 6 |
| PPTX export | Task 15 |
| PDF export via Puppeteer | Task 16 |
| Export API route (auth-gated, publishedAt check) | Task 16 |
| Editor page route with pre-loaded signed URLs | Task 13 |
| Open Editor button on pitch detail | Task 14 |
| Prisma migration for slideData | Task 1 |
