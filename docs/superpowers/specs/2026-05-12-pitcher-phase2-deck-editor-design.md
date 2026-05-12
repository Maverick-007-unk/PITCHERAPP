# PITCHER Phase 2 — Deck Editor & Export

**Date:** 2026-05-12
**Status:** Approved for implementation planning

---

## What We're Building

A full Fabric.js canvas deck editor where users can freely position, resize, and style text, images, and shapes on each slide. Slides are initialized from AI-generated pitch sections and can be reordered, added, and deleted. Completed decks export as PPTX or PDF.

---

## Decisions Summary

| Decision | Choice |
|---|---|
| Editor type | Free canvas (Fabric.js) — drag, resize, absolute positioning |
| Media | Images supported — upload to R2, render on canvas |
| Slide management | Full — reorder, add blank, delete |
| Data model | Typed `SlideElement` schema (not raw Fabric JSON) |
| PDF export | Puppeteer renders `/deck/[token]?print=1` |
| PPTX export | `pptxgenjs` maps `SlideElement[]` to shapes |
| Export trigger | Synchronous API route (no Inngest needed) |
| Auto-save | Debounced (1s) POST to `/api/deck/[id]/save` |

---

## Data Model

No new Prisma migrations needed — `Deck.slideData` is already `Json`. We define TypeScript types for what's stored there.

```ts
// lib/deck/types.ts

export type SlideElementType = 'text' | 'image' | 'shape'

export interface SlideElement {
  id: string
  type: SlideElementType
  // Position and size as % of slide dimensions (0–100)
  x: number
  y: number
  w: number
  h: number
  zIndex: number

  // text
  content?: string
  fontSize?: number        // px at 1920×1080 base
  fontFamily?: 'archivo-black' | 'space-mono' | 'inter'
  fontWeight?: number
  color?: string           // hex
  textTransform?: 'none' | 'uppercase'
  textAlign?: 'left' | 'center' | 'right'
  lineHeight?: number

  // image
  storageKey?: string      // R2 object key (persisted)
  objectFit?: 'cover' | 'contain'

  // shape
  fill?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
}

export interface Slide {
  id: string
  label: string            // display name in thumbnail panel
  background: string       // hex color
  elements: SlideElement[]
}

export type SlideData = Slide[]
```

**Coordinates in percentages** so the layout is resolution-independent — the canvas, Puppeteer, and PPTX all render correctly from the same values.

**Initializer** (`lib/deck/init-slide-data.ts`): after pitch generation completes, `PitchSections` is converted to a `SlideData` array — one `Slide` per section, each containing a pre-populated text element (label + content) and the theme's background color.

---

## Architecture

### New Files

```
lib/deck/
  types.ts               # SlideElement, Slide, SlideData types
  init-slide-data.ts     # PitchSections → SlideData initializer
  fabric-bridge.ts       # Fabric.js canvas ↔ SlideElement[] sync

lib/export/
  pdf.ts                 # Puppeteer → PDF binary
  pptx.ts                # pptxgenjs → PPTX binary

components/editor/
  deck-editor.tsx        # Top-level client component (canvas + panels)
  slide-panel.tsx        # Left: slide thumbnails, drag-to-reorder
  canvas-area.tsx        # Center: Fabric.js canvas wrapper
  properties-panel.tsx   # Right: selected element properties
  editor-toolbar.tsx     # Top: tool buttons, undo/redo, publish

app/(app)/pitch/[id]/
  page.tsx               # Updated: links to editor when deck exists
  editor/
    page.tsx             # Editor route (auth-gated)
    editor-client.tsx    # Hydrates DeckEditor with server data

app/api/
  deck/[id]/save/
    route.ts             # POST — debounced auto-save
  deck/[id]/upload-image/
    route.ts             # POST — upload image to R2, return storageKey
  pitch/export/
    route.ts             # GET ?id=&format=pdf|pptx — file download
```

### Updated Files

```
lib/inngest/pitch-generate.ts   # Add initSlideData() call after sections saved
app/(app)/pitch/[id]/page.tsx   # Add "Open Editor" button when deck exists
app/deck/[token]/page.tsx       # Add ?print=1 layout branch for Puppeteer
components/deck/slide-view.tsx  # Updated to render SlideData (not PitchSections)
```

---

## Feature Specs

### 1. Editor Layout

Three-panel layout inside the existing `(app)` shell:

- **Left (120px):** Slide thumbnail list. Each thumbnail is a mini canvas preview. Drag handle (⠿) for reorder via `@dnd-kit/sortable`. "+ ADD SLIDE" button at bottom adds a blank slide. Right-click → delete.
- **Center (flex):** Fabric.js canvas at 16:9 aspect ratio. Toolbar above: Text / Shape / Image tool buttons, Undo, Redo, Publish. Canvas background matches `Slide.background`.
- **Right (160px):** Properties panel for the currently selected Fabric object. Shows font, size, color, text-transform, X/Y/W/H fields, delete button. Updates are written to `SlideElement` state and reflected back on the canvas.

### 2. Fabric.js Integration (`fabric-bridge.ts`)

Fabric.js is used as the rendering and interaction engine. We do **not** persist Fabric's native JSON. Instead:

- On mount, `SlideData` is read and each `SlideElement` is instantiated as a Fabric object (`IText`, `Image`, `Rect`).
- On every `object:modified` / `object:added` / `object:removed` event, the canvas is walked and serialized back to `SlideElement[]` (percentage coordinates computed from canvas pixel dimensions).
- This `SlideElement[]` is the state that triggers debounced auto-save.

The bridge exports two functions:
- `loadSlide(canvas: Canvas, slide: Slide): void`
- `serializeCanvas(canvas: Canvas, slide: Slide): Slide`

### 3. Image Upload

Clicking the "IMAGE" toolbar button opens a file picker. The selected file is POSTed to `/api/deck/[id]/upload-image`, which streams it to R2 and returns a `storageKey`. A signed URL is fetched client-side for Fabric to load the image. The `storageKey` (not the URL) is stored in the `SlideElement`.

At render time (public deck view + export), signed URLs are generated server-side from stored `storageKey` values.

### 4. Auto-Save

`DeckEditor` holds `SlideData` in React state. Any mutation (element moved, text edited, slide reordered) updates state and starts a 1-second debounce timer. On fire, `POST /api/deck/[id]/save` with the full `SlideData` payload. A save-status indicator ("Saving…" / "Saved") in the toolbar reflects state.

### 5. Slide Management

- **Reorder:** `@dnd-kit/sortable` on the slide thumbnail list. Drag fires an array reorder, triggers auto-save.
- **Add:** "+ ADD SLIDE" creates a new `Slide` with a blank text element and the theme's background color.
- **Delete:** Right-click context menu on thumbnail → confirm → remove from array → auto-save. Minimum 1 slide enforced.

### 6. Export

**Route:** `GET /api/pitch/export?id=<pitchId>&format=pdf|pptx`

Auth-gated (org must own the pitch). Deck must be published (`publishedAt` set) — if not, the route returns a `400` and the UI shows "Publish the deck before exporting."

**PDF:**
1. Fetch `Deck.shareToken` for the pitch (guaranteed valid since deck is published).
2. Launch Puppeteer, navigate to `/deck/[token]?print=1`.
3. The print layout: black background, each slide is `1920×1080px`, no header, no spacing between slides, `page-break-after: always`.
4. `page.pdf({ width: '1920px', height: '1080px', printBackground: true })` — returns binary at native 16:9 resolution.
5. Response: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="pitch.pdf"`.

**PPTX:**
1. Read `Deck.slideData` as `SlideData`.
2. Create a `pptxgenjs` `PptxGenJS` instance, layout `LAYOUT_WIDE` (13.33"×7.5").
3. For each `Slide`:
   - `pptx.addSlide()` with background color.
   - For each `SlideElement`, convert coordinates: `x_inches = element.x / 100 * 13.33`.
   - `text` → `slide.addText()`, `image` → fetch from R2 → `slide.addImage()`, `shape` → `slide.addShape()`.
4. `pptx.write('nodebuffer')` → response with `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation`.

### 7. Public Deck View Update

`/deck/[token]` currently uses `SlideView` (renders `PitchSections`). After Phase 2, it reads `Deck.slideData` and renders each `Slide` as a positioned div stack — no Fabric.js dependency on the public page. Each `SlideElement` maps to an absolutely-positioned React element styled from the element's properties. `?print=1` adds full-bleed CSS overrides for Puppeteer.

### 8. Error Handling

- Auto-save failures: show "Save failed — retrying" in toolbar, retry once after 3s, then show permanent error with manual retry button.
- Image upload failures: inline error below the file picker, no canvas change.
- Export failures: `{ error: string }` JSON response, client shows a toast.
- Puppeteer not available in Vercel Edge runtime: export route must use `runtime = 'nodejs'` in route config.

---

## Testing

- `lib/deck/init-slide-data.ts` — unit tests: verify all 7 sections produce correct `Slide[]` shape.
- `lib/deck/fabric-bridge.ts` — unit tests with mock Fabric canvas: verify round-trip `loadSlide → serializeCanvas` preserves element values.
- `lib/export/pptx.ts` — unit test: given a known `SlideData`, verify `pptxgenjs` is called with correct coordinate values.
- `lib/export/pdf.ts` — integration test is impractical in CI (Puppeteer); add a smoke test that the route returns 200 with `application/pdf` content type (mock Puppeteer).
- `components/editor/deck-editor.tsx` — React Testing Library: render with fixture `SlideData`, verify panels render, verify auto-save fires after element mutation.

---

## Dependencies to Add

```
fabric              # Canvas editor
@dnd-kit/core       # Drag-and-drop primitives
@dnd-kit/sortable   # Slide reorder
pptxgenjs           # PPTX generation
puppeteer           # PDF export (headless Chrome)
```

---

## What's Not in Phase 2

- Custom brand kit upload (Phase 3)
- Viewer role enforcement on editor route (Phase 3)
- Billing/plan gating (Phase 3)
- Collaborative editing
- Slide templates beyond the AI-initialized default
