# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PITCHER is an esports sponsorship tool with three core capabilities:
1. **RFP Analyzer** — parse and extract key requirements from client Request for Proposal documents
2. **Sponsorship Pitch Generator** — generate tailored pitch content based on RFP analysis and past proposal data
3. **Deck Maker** — assemble the generated content into a structured presentation/deck

PITCHER is part of a larger suite of Esports Apps (siblings: CREATIVE, MARKETER, OPERATION MANAGER, ORGANIZER).

## Tech Stack

- **Framework:** Next.js (App Router)
- **UI:** React
- **Language:** TypeScript (preferred)

## Data Sources

Two local reference folders power the AI features — do not delete or restructure them:

- `RFP/` — client Request for Proposal documents (PDF, DOCX, etc.) ingested for analysis
- `Old Proposals/` — previous pitch decks and presentations used as style/content references for generation

## Standard Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

## Architecture

### Core Data Flow

```
RFP Document (uploaded)
    ↓
RFP Analyzer  →  structured JSON (client goals, budget, deliverables, deadlines)
    ↓
Pitch Generator  ←  Old Proposals/ (retrieval for tone/format reference)
    ↓
Deck Maker  →  exportable slide deck (PDF / PPTX)
```

### Key Architectural Decisions

- **App Router** (`app/`) is the routing layer. Each major capability (analyze, generate, deck) should be a distinct route segment.
- **Server Actions / API Routes** handle document parsing and AI calls — keep heavy processing server-side to avoid shipping API keys to the browser.
- **`/lib`** holds shared utilities: document parsers, AI client wrappers, proposal retrieval logic.
- **`/components`** holds reusable UI. Deck slides are components that render both in the browser preview and during export.

### Suggested Route Structure

```
app/
  analyze/        # RFP upload and analysis view
  generate/       # Pitch content generation
  deck/           # Deck builder and preview
  api/
    analyze/      # Server-side RFP parsing
    generate/     # AI pitch generation
    export/       # Deck export (PDF/PPTX)
```

## AI Integration Notes

- RFP parsing and pitch generation will call an LLM (Claude API preferred given the suite context).
- Old Proposals are used for retrieval-augmented generation (RAG) — index them at startup or on-demand, not on every request.
- Keep all AI API keys in `.env.local` and access them only in server components or API routes.
