# PITCHER Platform — Design Spec

**Date:** 2026-05-11  
**Status:** Approved for implementation planning

---

## What We're Building

PITCHER is a B2B SaaS web platform where esports organizations analyze client RFPs, generate AI-powered sponsorship pitches, build decks in a full editor, and deliver them as a shareable web link or downloadable file.

---

## Decisions Summary

| Decision | Choice |
|---|---|
| Platform type | SaaS — multiple esports orgs, each with their own account |
| Auth model | Org accounts with roles: Admin, Pitcher, Viewer |
| Deck output | Shareable web link + downloadable PPTX / PDF |
| Editor | Full Canva-lite editor (text, layout, images, sections) |
| Architecture | Next.js App Router + background job queue |
| Navigation | Icon sidebar — collapsed rail, active state in orange |
| Visual design | Kinetic Orange brutalist system (see Design System section) |
| Build order | RFP Analyzer → Theme Selector → Pitch Generator → Deck Editor → Export/Share |

---

## Architecture

### Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** Clerk (org-aware, roles out of the box)
- **File storage:** Cloudflare R2 (RFP uploads, generated assets)
- **Job queue:** Inngest (background processing for RFP parsing and AI generation)
- **AI:** Claude API (Anthropic) — `claude-sonnet-4-6` for generation, `claude-haiku-4-5` for extraction
- **Deck editor:** Fabric.js canvas wrapped in React
- **PPTX export:** `pptxgenjs`
- **PDF export:** Puppeteer (headless render of the deck view)
- **Deployment:** Vercel

### Why Inngest

RFP parsing and AI pitch generation can take 30–90 seconds. Vercel serverless functions time out at 60s. Inngest runs jobs durably outside the request cycle and provides real-time progress events the UI subscribes to via Server-Sent Events (SSE).

### Core Data Flow

```
RFP upload (PDF/DOCX)
    ↓
Inngest job: parse → extract structured JSON
    { client, budget, goals, deliverables, deadlines, audience }
    ↓
User selects deck theme
    ↓
Inngest job: retrieve similar Old Proposals (vector similarity)
             + Claude API generates pitch sections
    ↓
Deck Editor: user edits canvas, rearranges slides
    ↓
Export job: Puppeteer → PDF  |  pptxgenjs → PPTX
            + generate shareable /deck/[id] public URL
```

### Route Structure

```
app/
  (auth)/              # Clerk auth pages
  (app)/
    layout.tsx         # Icon sidebar shell
    dashboard/         # Home — stats, recent pitches
    rfp/
      page.tsx         # RFP list + upload
      [id]/            # RFP detail + extracted JSON
    pitch/
      new/             # Theme selection → generation trigger
      [id]/            # Pitch editor (Fabric.js canvas)
    deck/
      [id]/            # Public shareable deck view (no auth)
    team/              # Org settings, member roles
  api/
    rfp/               # Upload handler → trigger Inngest job
    pitch/generate/    # Trigger AI generation job
    pitch/export/      # PPTX + PDF export
    deck/[id]/         # Public deck data endpoint
    inngest/           # Inngest webhook receiver

lib/
  ai/                  # Claude API wrappers
  parser/              # PDF/DOCX → text extraction
  rag/                 # Old Proposals vector index + retrieval
  deck/                # Fabric.js canvas → slide data schema
  export/              # pptxgenjs + Puppeteer helpers

components/
  editor/              # Deck editor canvas, toolbar, slide panel
  deck-view/           # Read-only deck renderer (shared/public)
  ui/                  # Kinetic Orange design system components
```

### Data Models (Prisma)

```prisma
Org         { id, name, clerkOrgId, plan }
User        { id, clerkUserId, orgId, role: ADMIN|PITCHER|VIEWER }
RFP         { id, orgId, fileName, storageKey, status, extractedJson }
OldProposal { id, orgId, fileName, storageKey, embedding }
Pitch       { id, orgId, rfpId, themeId, status, sections: Json }
Deck        { id, pitchId, slideData: Json, shareToken, publishedAt }
Theme       { id, name, thumbnailUrl, config: Json }
```

---

## Feature Specs

### 1. RFP Analyzer

User uploads a PDF or DOCX. Inngest job extracts:
- Client name, industry, region
- Sponsorship budget range
- Deliverables requested (logo placement, activations, content, etc.)
- Campaign timeline and deadlines
- Target audience profile
- Success metrics

Output is a structured JSON stored on the `RFP` record. User sees a card-based summary view of extracted fields, can manually correct any field before proceeding.

### 2. Theme Selector

A grid of 4–8 deck themes (thumbnail previews). Each theme defines:
- Slide background color / image
- Font pairing
- Accent color
- Layout templates per slide type (cover, stats, services, CTA)

Themes are seeded data. Orgs on paid plans can upload custom brand kits.

### 3. Pitch Generator

After theme selection, an Inngest job:
1. Embeds the RFP JSON using OpenAI `text-embedding-3-small` and queries the Old Proposals vector index for the 3 most similar past pitches
2. Sends RFP data + retrieved proposal excerpts to Claude API
3. Claude generates structured pitch sections: Executive Summary, Why Us, Audience Reach, Deliverables, Pricing, Timeline, CTA
4. Sections are stored on the `Pitch` record

The UI shows a live progress bar via SSE while the job runs. On completion, the user is dropped into the Deck Editor with slides pre-populated.

### 4. Deck Editor

Fabric.js canvas with:
- Left panel: slide thumbnails (reorder via drag)
- Center: live canvas (click to select, drag to move, double-click to edit text)
- Right panel: properties (font, color, size, border)
- Toolbar: add text block, add image, add shape, add slide

Each slide maps to a `slideData` entry with absolute-positioned elements. The canvas renders identically in the editor and the public deck view.

### 5. Export & Share

**Share:** Publish button sets `Deck.publishedAt` and generates a `shareToken`. The public URL `/deck/[shareToken]` renders the deck read-only with no auth required.

**PPTX:** `pptxgenjs` maps `slideData` elements to PPTX shapes. Download triggers via `/api/pitch/export?format=pptx`.

**PDF:** Puppeteer renders `/deck/[shareToken]?print=1` (a full-bleed print layout) and returns a PDF binary.

---

## Design System — Kinetic Orange

### Tokens

```css
--orange: #FF4D00;
--black:  #000000;
--white:  #FFFFFF;
```

### Typography

| Role | Font | Weight | Size | Case | Tracking |
|---|---|---|---|---|---|
| Display / H1 | Archivo Black | 900 | 7–16vw | UPPERCASE | -0.04em |
| Section H2 | Archivo Black | 900 | 3–7vw | UPPERCASE | -0.04em |
| Labels / meta | Space Mono | 700 | 9–12px | UPPERCASE | -0.02em |
| Body | Inter | 400 | 14–16px | Sentence | 0 |

Line-height for Archivo Black: 0.85–0.90.

### Components

**Icon Sidebar:** 56px wide, `#000` bg, `2px solid #222` right border. Active icon: `1px solid var(--orange)`, orange icon color. Hover: white.

**Pill Button (primary):** `border-radius: 9999px`, `background: var(--orange)`, `color: var(--black)`, `border: 2px solid var(--orange)`, Space Mono 10px uppercase. Hover: `scale(1.08)`.

**Pill Button (outline):** Transparent bg, white text, `border: 2px solid #444`.

**Borders:** `2px solid #000` for section dividers. `1px solid rgba(255,255,255,0.08)` for list item separators on dark backgrounds.

**Marquee strip:** Full-width, `background: var(--orange)`, `transform: skewY(-1deg)`, Archivo Black 18px black text. Infinite linear scroll.

**List item hover:** Background `rgba(255,77,0,0.04)`, title `translateX(16px)`, arrow icon opacity 1 + `rotate(45deg)`.

**Selection color:** `background: #000; color: #FF4D00`.

**No:** gradients, drop shadows (except sidebar nav), rounded corners (except pills), soft pastels, standard sans-serifs for headlines.

---

## RAG Setup for Old Proposals

On first load (or when a file is added to `Old Proposals/`), an Inngest job:
1. Extracts text from each file
2. Chunks by section (≈500 tokens)
3. Embeds with OpenAI `text-embedding-3-small`
4. Stores embeddings in `OldProposal` records (pgvector extension on PostgreSQL)

At generation time, the RFP JSON is embedded and the top-3 nearest proposals are retrieved as context.

---

## Auth & Roles

Clerk handles SSO, org creation, and member invites. Role mapping:

| Role | Can do |
|---|---|
| Admin | All actions + invite members, manage billing, upload brand kit |
| Pitcher | Create/edit RFPs, pitches, decks; export; share |
| Viewer | View pitches and decks only; cannot create or export |

Middleware in `app/(app)/layout.tsx` checks Clerk org membership and role on every protected route.

---

## MVP Scope

Phase 1 (ship first):
- Org auth (Clerk)
- RFP upload + Inngest parsing job
- Extracted JSON review UI
- Theme selector (4 seeded themes)
- AI pitch generation (Inngest + Claude API)
- Read-only deck view: AI-generated sections rendered as styled HTML slides (no canvas editor yet)
- Share link pointing to that read-only view

Phase 2:
- Full Deck Editor (Fabric.js)
- PPTX + PDF export
- Old Proposals RAG

Phase 3:
- Custom brand kit upload
- Viewer role enforcement
- Billing / plan gating
