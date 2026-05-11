# PITCHER MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the PITCHER MVP — org-authenticated SaaS where esports teams upload RFPs, get AI-generated sponsorship pitches, and share read-only deck links.

**Architecture:** Next.js 14 App Router with Clerk for org auth, Inngest for background jobs (RFP parsing + pitch generation), PostgreSQL + pgvector for data + RAG, Cloudflare R2 for file storage, Claude API for AI, and a Kinetic Orange brutalist design system.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Prisma + PostgreSQL + pgvector, Clerk, Inngest, Cloudflare R2, Anthropic SDK (claude-sonnet-4-6), OpenAI SDK (text-embedding-3-small), pdf-parse, mammoth, Vitest + React Testing Library

---

## File Map

```
pitcher/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                    # Clerk org guard + icon sidebar shell
│   │   ├── dashboard/page.tsx            # Stats overview
│   │   ├── rfp/
│   │   │   ├── page.tsx                  # RFP list + upload
│   │   │   └── [id]/page.tsx             # RFP detail + extracted JSON
│   │   ├── pitch/
│   │   │   ├── new/page.tsx              # Theme selector → trigger generation
│   │   │   └── [id]/page.tsx             # Read-only pitch/deck view (authed)
│   │   └── team/page.tsx                 # Org members list
│   ├── deck/[token]/page.tsx             # Public shareable deck (no auth)
│   └── api/
│       ├── rfp/route.ts                  # POST: upload file → R2 → Inngest
│       ├── pitch/
│       │   ├── generate/route.ts         # POST: trigger pitch generation job
│       │   └── progress/[jobId]/route.ts # GET: SSE stream for job progress
│       ├── deck/[token]/route.ts         # GET: public deck JSON
│       └── inngest/route.ts             # Inngest webhook receiver
├── lib/
│   ├── db/client.ts                      # Prisma singleton
│   ├── storage/r2.ts                     # R2 upload/download helpers
│   ├── inngest/
│   │   ├── client.ts                     # Inngest client singleton
│   │   ├── rfp-parse.ts                  # Inngest fn: parse RFP text + extract JSON
│   │   └── pitch-generate.ts             # Inngest fn: RAG + Claude generation
│   ├── ai/
│   │   ├── claude.ts                     # Anthropic client singleton
│   │   ├── extract-rfp.ts                # RFP extraction prompt + schema
│   │   └── generate-pitch.ts             # Pitch generation prompt + schema
│   ├── parser/
│   │   └── extract-text.ts              # PDF/DOCX → plain text
│   └── rag/
│       ├── embed.ts                      # OpenAI embedding wrapper
│       ├── index-proposals.ts            # Index Old Proposals/ folder into pgvector
│       └── retrieve.ts                   # Cosine similarity retrieval
├── components/
│   ├── ui/
│   │   ├── sidebar.tsx                   # Icon sidebar (Kinetic Orange)
│   │   ├── pill-button.tsx               # Orange pill button
│   │   └── marquee.tsx                   # Skewed scrolling marquee
│   ├── rfp/
│   │   ├── upload-zone.tsx               # Drag-drop file uploader
│   │   └── rfp-summary-card.tsx          # Extracted JSON field card
│   ├── pitch/
│   │   ├── theme-grid.tsx                # Theme picker grid
│   │   └── generation-progress.tsx       # SSE progress bar
│   └── deck/
│       └── slide-view.tsx                # Read-only HTML slide renderer
├── prisma/
│   └── schema.prisma
├── middleware.ts                          # Clerk auth middleware
├── tailwind.config.ts
└── vitest.config.ts
```

---

## Task 1: Scaffold Project + Install Dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`, `.env.local.example`

- [ ] **Step 1: Create Next.js app**

```bash
npx create-next-app@latest pitcher --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd pitcher
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install @clerk/nextjs inngest @anthropic-ai/sdk openai @prisma/client @aws-sdk/client-s3 @aws-sdk/s3-request-presigner pdf-parse mammoth pgvector
npm install -D prisma vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @types/pdf-parse jsdom
```

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 4: Create vitest.setup.ts**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create .env.local.example**

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/pitcher

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=pitcher-files
R2_PUBLIC_URL=

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with all dependencies"
```

---

## Task 2: Tailwind + Kinetic Orange Design Tokens

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing test**

```ts
// components/ui/__tests__/pill-button.test.tsx
import { render, screen } from '@testing-library/react'
import { PillButton } from '../pill-button'

test('renders primary pill button with correct text', () => {
  render(<PillButton>Upload RFP</PillButton>)
  expect(screen.getByRole('button', { name: 'Upload RFP' })).toBeInTheDocument()
})

test('renders outline variant', () => {
  render(<PillButton variant="outline">Cancel</PillButton>)
  const btn = screen.getByRole('button', { name: 'Cancel' })
  expect(btn).toHaveClass('border-ko-white/30')
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run components/ui/__tests__/pill-button.test.tsx
```
Expected: FAIL — `Cannot find module '../pill-button'`

- [ ] **Step 3: Update tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'ko-orange': '#FF4D00',
        'ko-black': '#000000',
        'ko-white': '#FFFFFF',
      },
      fontFamily: {
        archivo: ['var(--font-archivo)', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      letterSpacing: {
        tight4: '-0.04em',
        tight2: '-0.02em',
      },
      lineHeight: {
        brutalist: '0.88',
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 4: Update app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

::selection {
  background: #000000;
  color: #FF4D00;
}

@layer base {
  body {
    @apply bg-ko-black text-ko-white font-sans;
  }
}
```

- [ ] **Step 5: Update app/layout.tsx with fonts**

```tsx
import { Archivo_Black, Space_Mono, Inter } from 'next/font/google'
import './globals.css'

const archivo = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-archivo',
})
const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
})
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata = { title: 'PITCHER', description: 'Esports Sponsorship OS' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${spaceMono.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Create components/ui/pill-button.tsx**

```tsx
import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline'
}

export function PillButton({ variant = 'primary', className, children, ...props }: PillButtonProps) {
  return (
    <button
      className={cn(
        'rounded-full border-2 font-mono text-[10px] uppercase tracking-tight2 px-4 py-1.5 font-bold transition-transform hover:scale-105',
        variant === 'primary' && 'bg-ko-orange border-ko-orange text-ko-black',
        variant === 'outline' && 'bg-transparent border-ko-white/30 text-ko-white',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 7: Create lib/utils.ts**

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Install clsx + tailwind-merge: `npm install clsx tailwind-merge`

- [ ] **Step 8: Run test — verify it passes**

```bash
npx vitest run components/ui/__tests__/pill-button.test.tsx
```
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: Kinetic Orange design tokens and PillButton component"
```

---

## Task 3: Prisma Schema + Database Migration

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db/client.ts`

- [ ] **Step 1: Enable pgvector in your PostgreSQL instance**

```sql
-- Run in psql or your DB admin tool:
CREATE EXTENSION IF NOT EXISTS vector;
```

- [ ] **Step 2: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 3: Write prisma/schema.prisma**

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

enum Role {
  ADMIN
  PITCHER
  VIEWER
}

enum JobStatus {
  PENDING
  RUNNING
  DONE
  FAILED
}

model Org {
  id          String   @id @default(cuid())
  clerkOrgId  String   @unique
  name        String
  createdAt   DateTime @default(now())
  users       User[]
  rfps        RFP[]
  pitches     Pitch[]
  proposals   OldProposal[]
}

model User {
  id          String   @id @default(cuid())
  clerkUserId String   @unique
  orgId       String
  role        Role     @default(PITCHER)
  org         Org      @relation(fields: [orgId], references: [id])
}

model RFP {
  id            String    @id @default(cuid())
  orgId         String
  fileName      String
  storageKey    String
  status        JobStatus @default(PENDING)
  extractedJson Json?
  inngestJobId  String?
  createdAt     DateTime  @default(now())
  org           Org       @relation(fields: [orgId], references: [id])
  pitches       Pitch[]
}

model OldProposal {
  id          String                       @id @default(cuid())
  orgId       String
  fileName    String
  storageKey  String
  embedding   Unsupported("vector(1536)")?
  createdAt   DateTime                     @default(now())
  org         Org                          @relation(fields: [orgId], references: [id])
}

model Theme {
  id           String   @id @default(cuid())
  name         String
  thumbnailUrl String
  config       Json
  pitches      Pitch[]
}

model Pitch {
  id           String    @id @default(cuid())
  orgId        String
  rfpId        String
  themeId      String
  status       JobStatus @default(PENDING)
  sections     Json?
  inngestJobId String?
  createdAt    DateTime  @default(now())
  org          Org       @relation(fields: [orgId], references: [id])
  rfp          RFP       @relation(fields: [rfpId], references: [id])
  theme        Theme     @relation(fields: [themeId], references: [id])
  deck         Deck?
}

model Deck {
  id          String    @id @default(cuid())
  pitchId     String    @unique
  shareToken  String    @unique @default(cuid())
  publishedAt DateTime?
  pitch       Pitch     @relation(fields: [pitchId], references: [id])
}
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name init
```
Expected: Migration applied, Prisma client generated.

- [ ] **Step 5: Create lib/db/client.ts**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Prisma schema with pgvector + db client singleton"
```

---

## Task 4: Clerk Auth Setup

**Files:**
- Create: `middleware.ts`
- Create: `app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Create: `app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Wrap app with ClerkProvider in app/layout.tsx**

```tsx
import { ClerkProvider } from '@clerk/nextjs'
import { Archivo_Black, Space_Mono, Inter } from 'next/font/google'
import './globals.css'

const archivo = Archivo_Black({ weight: '400', subsets: ['latin'], variable: '--font-archivo' })
const spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-space-mono' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata = { title: 'PITCHER', description: 'Esports Sponsorship OS' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${archivo.variable} ${spaceMono.variable} ${inter.variable}`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Step 2: Create middleware.ts**

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/deck/(.*)',        // public shared decks
  '/api/deck/(.*)',   // public deck API
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth().protect()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
```

- [ ] **Step 3: Create sign-in page**

```tsx
// app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-ko-black flex items-center justify-center">
      <SignIn />
    </div>
  )
}
```

- [ ] **Step 4: Create sign-up page**

```tsx
// app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-ko-black flex items-center justify-center">
      <SignUp />
    </div>
  )
}
```

- [ ] **Step 5: Verify auth works**

```bash
npm run dev
```
Navigate to `http://localhost:3000/dashboard` — should redirect to `/sign-in`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Clerk auth middleware and sign-in/sign-up pages"
```

---

## Task 5: Icon Sidebar + App Shell

**Files:**
- Create: `components/ui/sidebar.tsx`
- Create: `app/(app)/layout.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/ui/__tests__/sidebar.test.tsx
import { render, screen } from '@testing-library/react'
import { Sidebar } from '../sidebar'

test('renders sidebar with RFP nav link', () => {
  render(<Sidebar activeItem="rfp" />)
  expect(screen.getByLabelText('RFPs')).toBeInTheDocument()
})

test('active item has orange border class', () => {
  render(<Sidebar activeItem="rfp" />)
  expect(screen.getByLabelText('RFPs')).toHaveClass('border-ko-orange')
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run components/ui/__tests__/sidebar.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create components/ui/sidebar.tsx**

```tsx
'use client'
import Link from 'next/link'
import { LayoutGrid, FileText, Star, Monitor, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = 'dashboard' | 'rfp' | 'pitch' | 'deck' | 'team'

const NAV = [
  { id: 'dashboard' as NavItem, href: '/dashboard', icon: LayoutGrid, label: 'Home' },
  { id: 'rfp' as NavItem, href: '/rfp', icon: FileText, label: 'RFPs' },
  { id: 'pitch' as NavItem, href: '/pitch/new', icon: Star, label: 'Pitch' },
  { id: 'deck' as NavItem, href: '/pitch', icon: Monitor, label: 'Decks' },
  { id: 'team' as NavItem, href: '/team', icon: Users, label: 'Team' },
]

export function Sidebar({ activeItem }: { activeItem: NavItem }) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-14 bg-ko-black border-r-2 border-[#222] flex flex-col items-center py-4 gap-1.5 z-50">
      <div className="font-archivo text-[11px] text-ko-orange uppercase tracking-tight4 border-2 border-ko-orange px-1 py-1.5 mb-3 writing-mode-vertical rotate-180">
        P
      </div>
      {NAV.map(({ id, href, icon: Icon, label }) => (
        <Link
          key={id}
          href={href}
          aria-label={label}
          className={cn(
            'w-9 h-9 flex flex-col items-center justify-center gap-1 border font-mono text-[8px] uppercase tracking-tight2 transition-colors',
            activeItem === id
              ? 'text-ko-orange border-ko-orange'
              : 'text-[#555] border-transparent hover:text-ko-white hover:border-[#444]'
          )}
        >
          <Icon size={14} />
          {label}
        </Link>
      ))}
    </aside>
  )
}
```

Install lucide: `npm install lucide-react`

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run components/ui/__tests__/sidebar.test.tsx
```
Expected: PASS

- [ ] **Step 5: Create app/(app)/layout.tsx**

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/ui/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgId } = auth()
  if (!userId || !orgId) redirect('/sign-in')

  return (
    <div className="flex min-h-screen bg-ko-black">
      <Sidebar activeItem="dashboard" />
      <main className="ml-14 flex-1">{children}</main>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: icon sidebar and app shell layout"
```

---

## Task 6: Cloudflare R2 Storage Client + RFP Upload API

**Files:**
- Create: `lib/storage/r2.ts`
- Create: `app/api/rfp/route.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/storage/__tests__/r2.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: vi.fn() })),
  PutObjectCommand: vi.fn(),
}))

import { buildStorageKey } from '../r2'

describe('buildStorageKey', () => {
  it('generates a key with orgId prefix', () => {
    const key = buildStorageKey('org_123', 'proposal.pdf')
    expect(key).toMatch(/^org_123\/rfp\//)
    expect(key).toMatch(/\.pdf$/)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run lib/storage/__tests__/r2.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create lib/storage/r2.ts**

```ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export function buildStorageKey(orgId: string, fileName: string): string {
  const ext = fileName.split('.').pop()
  return `${orgId}/rfp/${randomUUID()}.${ext}`
}

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
}

export async function getDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(r2, new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }), { expiresIn: 3600 })
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run lib/storage/__tests__/r2.test.ts
```
Expected: PASS

- [ ] **Step 5: Create app/api/rfp/route.ts**

```ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { buildStorageKey, uploadFile } from '@/lib/storage/r2'
import { inngest } from '@/lib/inngest/client'

export async function POST(req: NextRequest) {
  const { userId, orgId } = auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only PDF and DOCX files are supported' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = buildStorageKey(orgId, file.name)
  await uploadFile(key, buffer, file.type)

  // Ensure org record exists
  await db.org.upsert({
    where: { clerkOrgId: orgId },
    create: { clerkOrgId: orgId, name: orgId },
    update: {},
  })

  const org = await db.org.findUniqueOrThrow({ where: { clerkOrgId: orgId } })

  const rfp = await db.rFP.create({
    data: { orgId: org.id, fileName: file.name, storageKey: key, status: 'PENDING' },
  })

  await inngest.send({ name: 'rfp/parse', data: { rfpId: rfp.id, storageKey: key, fileType: file.type } })

  return NextResponse.json({ rfpId: rfp.id }, { status: 201 })
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: R2 storage client and RFP upload API route"
```

---

## Task 7: Inngest Client + RFP Parsing Job

**Files:**
- Create: `lib/inngest/client.ts`
- Create: `lib/parser/extract-text.ts`
- Create: `lib/ai/claude.ts`
- Create: `lib/ai/extract-rfp.ts`
- Create: `lib/inngest/rfp-parse.ts`
- Create: `app/api/inngest/route.ts`

- [ ] **Step 1: Write the failing test for text extraction**

```ts
// lib/parser/__tests__/extract-text.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({ text: 'Extracted PDF text' }),
}))
vi.mock('mammoth', () => ({
  extractRawText: vi.fn().mockResolvedValue({ value: 'Extracted DOCX text' }),
}))

import { extractText } from '../extract-text'

describe('extractText', () => {
  it('extracts text from PDF', async () => {
    const buf = Buffer.from('fake-pdf')
    const text = await extractText(buf, 'application/pdf')
    expect(text).toBe('Extracted PDF text')
  })

  it('extracts text from DOCX', async () => {
    const buf = Buffer.from('fake-docx')
    const text = await extractText(buf, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    expect(text).toBe('Extracted DOCX text')
  })

  it('throws for unsupported type', async () => {
    await expect(extractText(Buffer.from(''), 'text/plain')).rejects.toThrow('Unsupported')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run lib/parser/__tests__/extract-text.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create lib/parser/extract-text.ts**

```ts
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const result = await pdfParse(buffer)
    return result.text
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  throw new Error(`Unsupported file type: ${mimeType}`)
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run lib/parser/__tests__/extract-text.test.ts
```
Expected: PASS

- [ ] **Step 5: Create lib/inngest/client.ts**

```ts
import { Inngest } from 'inngest'

export const inngest = new Inngest({ id: 'pitcher' })
```

- [ ] **Step 6: Create lib/ai/claude.ts**

```ts
import Anthropic from '@anthropic-ai/sdk'

export const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
```

- [ ] **Step 7: Write failing test for RFP extraction**

```ts
// lib/ai/__tests__/extract-rfp.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('../claude', () => ({
  claude: {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          clientName: 'Red Bull',
          industry: 'Energy Drinks',
          budgetRange: '$500k-$1M',
          deliverables: ['logo placement', 'social posts'],
          timeline: 'Q3 2026',
          targetAudience: '18-34 gamers',
          goals: ['brand awareness'],
          successMetrics: ['impressions'],
        }) }],
      }),
    },
  },
}))

import { extractRfpData } from '../extract-rfp'

it('extracts structured data from RFP text', async () => {
  const result = await extractRfpData('We are Red Bull looking for esports sponsorship...')
  expect(result.clientName).toBe('Red Bull')
  expect(result.deliverables).toContain('logo placement')
})
```

- [ ] **Step 8: Run test — verify it fails**

```bash
npx vitest run lib/ai/__tests__/extract-rfp.test.ts
```
Expected: FAIL

- [ ] **Step 9: Create lib/ai/extract-rfp.ts**

```ts
import { claude } from './claude'

export interface RfpData {
  clientName: string
  industry: string
  budgetRange: string
  deliverables: string[]
  timeline: string
  targetAudience: string
  goals: string[]
  successMetrics: string[]
}

export async function extractRfpData(text: string): Promise<RfpData> {
  const response = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Extract sponsorship RFP data from the following document. Return ONLY valid JSON matching this schema:
{
  "clientName": string,
  "industry": string,
  "budgetRange": string,
  "deliverables": string[],
  "timeline": string,
  "targetAudience": string,
  "goals": string[],
  "successMetrics": string[]
}

Document:
${text.slice(0, 8000)}`,
    }],
  })

  const raw = response.content[0]
  if (raw.type !== 'text') throw new Error('Unexpected response type from Claude')
  return JSON.parse(raw.text) as RfpData
}
```

- [ ] **Step 10: Run test — verify it passes**

```bash
npx vitest run lib/ai/__tests__/extract-rfp.test.ts
```
Expected: PASS

- [ ] **Step 11: Create lib/inngest/rfp-parse.ts**

```ts
import { inngest } from './client'
import { db } from '@/lib/db/client'
import { r2 } from '@/lib/storage/r2'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { extractText } from '@/lib/parser/extract-text'
import { extractRfpData } from '@/lib/ai/extract-rfp'

export const rfpParseFunction = inngest.createFunction(
  { id: 'rfp-parse', name: 'Parse RFP Document' },
  { event: 'rfp/parse' },
  async ({ event, step }) => {
    const { rfpId, storageKey, fileType } = event.data

    await step.run('update-status-running', async () => {
      await db.rFP.update({ where: { id: rfpId }, data: { status: 'RUNNING' } })
    })

    const text = await step.run('download-and-extract-text', async () => {
      const obj = await r2.send(new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: storageKey,
      }))
      const chunks: Uint8Array[] = []
      for await (const chunk of obj.Body as AsyncIterable<Uint8Array>) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)
      return extractText(buffer, fileType)
    })

    const extractedJson = await step.run('claude-extract', async () => {
      return extractRfpData(text)
    })

    await step.run('save-and-complete', async () => {
      await db.rFP.update({
        where: { id: rfpId },
        data: { status: 'DONE', extractedJson: extractedJson as object },
      })
    })
  }
)
```

- [ ] **Step 12: Create app/api/inngest/route.ts**

```ts
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { rfpParseFunction } from '@/lib/inngest/rfp-parse'
import { pitchGenerateFunction } from '@/lib/inngest/pitch-generate'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [rfpParseFunction, pitchGenerateFunction],
})
```

Note: `pitchGenerateFunction` will be created in Task 11. Add a placeholder export for now:

```ts
// lib/inngest/pitch-generate.ts (stub — full implementation in Task 11)
import { inngest } from './client'
export const pitchGenerateFunction = inngest.createFunction(
  { id: 'pitch-generate', name: 'Generate Pitch' },
  { event: 'pitch/generate' },
  async () => { return { status: 'stub' } }
)
```

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: Inngest setup, text extraction, RFP parsing job with Claude"
```

---

## Task 8: RFP Upload UI + List + Detail Pages

**Files:**
- Create: `components/rfp/upload-zone.tsx`
- Create: `components/rfp/rfp-summary-card.tsx`
- Create: `app/(app)/rfp/page.tsx`
- Create: `app/(app)/rfp/[id]/page.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/rfp/__tests__/upload-zone.test.tsx
import { render, screen } from '@testing-library/react'
import { UploadZone } from '../upload-zone'

test('renders upload zone with instruction text', () => {
  render(<UploadZone onUpload={async () => {}} />)
  expect(screen.getByText(/drop your rfp/i)).toBeInTheDocument()
})

test('shows accepted file types', () => {
  render(<UploadZone onUpload={async () => {}} />)
  expect(screen.getByText(/pdf.*docx/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run components/rfp/__tests__/upload-zone.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create components/rfp/upload-zone.tsx**

```tsx
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export function UploadZone({ onUpload }: { onUpload: (file: File) => Promise<void> }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    setLoading(true)
    await onUpload(file)
    setLoading(false)
  }, [onUpload])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 ${dragging ? 'border-ko-orange' : 'border-[#333]'} p-12 flex flex-col items-center gap-4 transition-colors`}
    >
      <p className="font-archivo text-4xl uppercase tracking-tight4 text-ko-white">
        Drop Your RFP
      </p>
      <p className="font-mono text-[10px] uppercase tracking-tight2 text-[#555]">
        PDF or DOCX — max 20MB
      </p>
      <label className="cursor-pointer">
        <input
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setLoading(true)
            await onUpload(file)
            setLoading(false)
          }}
        />
        <span className="font-mono text-[10px] uppercase tracking-tight2 border-2 border-[#444] text-ko-white px-4 py-2 hover:border-ko-orange transition-colors">
          {loading ? 'Uploading...' : 'Browse Files'}
        </span>
      </label>
    </div>
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run components/rfp/__tests__/upload-zone.test.tsx
```
Expected: PASS

- [ ] **Step 5: Create components/rfp/rfp-summary-card.tsx**

```tsx
interface RfpSummaryCardProps {
  label: string
  value: string | string[]
}

export function RfpSummaryCard({ label, value }: RfpSummaryCardProps) {
  return (
    <div className="border-l-2 border-ko-orange pl-4 py-2">
      <p className="font-mono text-[9px] uppercase tracking-tight2 text-[#555] mb-1">{label}</p>
      {Array.isArray(value) ? (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => (
            <span key={v} className="font-mono text-[9px] uppercase tracking-tight2 border border-[#333] text-[#888] px-2 py-0.5 rounded-full">{v}</span>
          ))}
        </div>
      ) : (
        <p className="font-archivo text-xl uppercase tracking-tight4 text-ko-white">{value || '—'}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create app/(app)/rfp/page.tsx**

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'
import { UploadZone } from '@/components/rfp/upload-zone'
import { RfpUploadClient } from './rfp-upload-client'
import Link from 'next/link'

export default async function RfpPage() {
  const { orgId } = auth()
  if (!orgId) redirect('/sign-in')

  const org = await db.org.findUnique({ where: { clerkOrgId: orgId } })
  const rfps = org ? await db.rFP.findMany({ where: { orgId: org.id }, orderBy: { createdAt: 'desc' } }) : []

  return (
    <div className="p-6">
      <div className="border-b-2 border-[#222] pb-4 mb-8">
        <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange mb-1">// RFP Analyzer</p>
        <h1 className="font-archivo text-6xl uppercase tracking-tight4 leading-brutalist">Request<br/>For Proposals</h1>
      </div>
      <RfpUploadClient />
      <div className="mt-12">
        <p className="font-mono text-[10px] uppercase tracking-tight2 text-[#555] mb-4">// {rfps.length} documents</p>
        {rfps.map((rfp) => (
          <Link key={rfp.id} href={`/rfp/${rfp.id}`} className="flex items-center gap-4 py-4 border-b border-[#222] hover:pl-4 transition-all group">
            <span className="font-mono text-[10px] text-ko-orange uppercase">{rfp.status}</span>
            <span className="font-archivo text-2xl uppercase tracking-tight4 group-hover:text-ko-orange transition-colors">{rfp.fileName}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create app/(app)/rfp/rfp-upload-client.tsx (client upload handler)**

```tsx
'use client'
import { useRouter } from 'next/navigation'
import { UploadZone } from '@/components/rfp/upload-zone'

export function RfpUploadClient() {
  const router = useRouter()

  async function handleUpload(file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/rfp', { method: 'POST', body: form })
    if (!res.ok) throw new Error('Upload failed')
    const { rfpId } = await res.json()
    router.push(`/rfp/${rfpId}`)
  }

  return <UploadZone onUpload={handleUpload} />
}
```

- [ ] **Step 8: Create app/(app)/rfp/[id]/page.tsx**

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { RfpSummaryCard } from '@/components/rfp/rfp-summary-card'
import { PillButton } from '@/components/ui/pill-button'
import Link from 'next/link'
import type { RfpData } from '@/lib/ai/extract-rfp'

export default async function RfpDetailPage({ params }: { params: { id: string } }) {
  const { orgId } = auth()
  if (!orgId) redirect('/sign-in')

  const rfp = await db.rFP.findUnique({ where: { id: params.id } })
  if (!rfp) notFound()

  const data = rfp.extractedJson as RfpData | null

  return (
    <div className="p-6">
      <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange mb-2">// RFP Detail</p>
      <h1 className="font-archivo text-5xl uppercase tracking-tight4 leading-brutalist mb-2">{rfp.fileName}</h1>
      <span className={`font-mono text-[9px] uppercase tracking-tight2 border px-2 py-0.5 ${rfp.status === 'DONE' ? 'border-ko-orange text-ko-orange' : 'border-[#444] text-[#555]'}`}>
        {rfp.status}
      </span>

      {rfp.status === 'RUNNING' && (
        <p className="font-mono text-[10px] uppercase tracking-tight2 text-[#555] mt-8 animate-pulse">
          // Claude is extracting your RFP data...
        </p>
      )}

      {data && (
        <div className="grid grid-cols-2 gap-4 mt-8">
          <RfpSummaryCard label="Client" value={data.clientName} />
          <RfpSummaryCard label="Industry" value={data.industry} />
          <RfpSummaryCard label="Budget Range" value={data.budgetRange} />
          <RfpSummaryCard label="Timeline" value={data.timeline} />
          <RfpSummaryCard label="Target Audience" value={data.targetAudience} />
          <RfpSummaryCard label="Deliverables" value={data.deliverables} />
          <RfpSummaryCard label="Goals" value={data.goals} />
          <RfpSummaryCard label="Success Metrics" value={data.successMetrics} />
        </div>
      )}

      {rfp.status === 'DONE' && (
        <div className="mt-8">
          <Link href={`/pitch/new?rfpId=${rfp.id}`}>
            <PillButton>Generate Pitch →</PillButton>
          </Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: RFP upload zone, list page, and detail page with extracted JSON"
```

---

## Task 9: Old Proposals RAG Indexer

**Files:**
- Create: `lib/rag/embed.ts`
- Create: `lib/rag/index-proposals.ts`
- Create: `lib/rag/retrieve.ts`

- [ ] **Step 1: Write failing test for embed**

```ts
// lib/rag/__tests__/embed.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('openai', () => ({
  default: vi.fn(() => ({
    embeddings: {
      create: vi.fn().mockResolvedValue({ data: [{ embedding: Array(1536).fill(0.1) }] }),
    },
  })),
}))

import { embedText } from '../embed'

it('returns a 1536-dimensional embedding vector', async () => {
  const vec = await embedText('some esports proposal text')
  expect(vec).toHaveLength(1536)
  expect(vec[0]).toBeTypeOf('number')
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run lib/rag/__tests__/embed.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create lib/rag/embed.ts**

```ts
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  })
  return response.data[0].embedding
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run lib/rag/__tests__/embed.test.ts
```
Expected: PASS

- [ ] **Step 5: Create lib/rag/index-proposals.ts**

```ts
import * as fs from 'fs/promises'
import * as path from 'path'
import { db } from '@/lib/db/client'
import { uploadFile, buildStorageKey } from '@/lib/storage/r2'
import { extractText } from '@/lib/parser/extract-text'
import { embedText } from './embed'

const PROPOSALS_DIR = path.join(process.cwd(), 'Old Proposals')

export async function indexOldProposals(orgId: string): Promise<void> {
  const org = await db.org.findUniqueOrThrow({ where: { clerkOrgId: orgId } })
  let files: string[]
  try {
    files = await fs.readdir(PROPOSALS_DIR)
  } catch {
    console.warn('Old Proposals/ directory not found — skipping RAG indexing')
    return
  }

  for (const fileName of files) {
    const existing = await db.oldProposal.findFirst({ where: { orgId: org.id, fileName } })
    if (existing) continue

    const filePath = path.join(PROPOSALS_DIR, fileName)
    const buffer = await fs.readFile(filePath)
    const mimeType = fileName.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    const text = await extractText(buffer, mimeType)
    const embedding = await embedText(text)

    const key = buildStorageKey(org.id, fileName).replace('/rfp/', '/proposals/')
    await uploadFile(key, buffer, mimeType)

    await db.$executeRaw`
      INSERT INTO "OldProposal" (id, "orgId", "fileName", "storageKey", embedding, "createdAt")
      VALUES (gen_random_uuid(), ${org.id}, ${fileName}, ${key}, ${JSON.stringify(embedding)}::vector, NOW())
    `
  }
}
```

- [ ] **Step 6: Create lib/rag/retrieve.ts**

```ts
import { db } from '@/lib/db/client'
import { embedText } from './embed'

export interface ProposalChunk {
  fileName: string
  similarity: number
}

export async function retrieveSimilarProposals(orgId: string, query: string, topK = 3): Promise<ProposalChunk[]> {
  const org = await db.org.findUniqueOrThrow({ where: { clerkOrgId: orgId } })
  const queryEmbedding = await embedText(query)

  const results = await db.$queryRaw<Array<{ fileName: string; similarity: number }>>`
    SELECT "fileName", 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
    FROM "OldProposal"
    WHERE "orgId" = ${org.id}
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${topK}
  `
  return results
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: OpenAI embeddings, proposal indexer, and RAG retrieval"
```

---

## Task 10: Seed Themes + Theme Selector Page

**Files:**
- Create: `prisma/seed.ts`
- Create: `components/pitch/theme-grid.tsx`
- Create: `app/(app)/pitch/new/page.tsx`

- [ ] **Step 1: Create prisma/seed.ts**

```ts
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const themes = [
    {
      name: 'Kinetic Orange',
      thumbnailUrl: '/themes/kinetic-orange.png',
      config: { bg: '#000000', accent: '#FF4D00', fontHeader: 'Archivo Black', fontBody: 'Inter' },
    },
    {
      name: 'Midnight Pro',
      thumbnailUrl: '/themes/midnight-pro.png',
      config: { bg: '#0a0a14', accent: '#7c3aed', fontHeader: 'Archivo Black', fontBody: 'Inter' },
    },
    {
      name: 'White Label',
      thumbnailUrl: '/themes/white-label.png',
      config: { bg: '#ffffff', accent: '#000000', fontHeader: 'Archivo Black', fontBody: 'Inter' },
    },
    {
      name: 'Steel Blue',
      thumbnailUrl: '/themes/steel-blue.png',
      config: { bg: '#0f172a', accent: '#3b82f6', fontHeader: 'Archivo Black', fontBody: 'Inter' },
    },
  ]

  for (const theme of themes) {
    await db.theme.upsert({
      where: { id: theme.name },
      create: { id: theme.name, ...theme },
      update: theme,
    })
  }
  console.log('Themes seeded')
}

main().catch(console.error).finally(() => db.$disconnect())
```

Add to `package.json`:
```json
"prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }
```
Install ts-node: `npm install -D ts-node`

Run seed: `npx prisma db seed`

- [ ] **Step 2: Write failing test for ThemeGrid**

```tsx
// components/pitch/__tests__/theme-grid.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeGrid } from '../theme-grid'

const themes = [
  { id: 'Kinetic Orange', name: 'Kinetic Orange', thumbnailUrl: '/t.png', config: {} },
  { id: 'Midnight Pro', name: 'Midnight Pro', thumbnailUrl: '/t.png', config: {} },
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
  expect(onSelect).toHaveBeenCalledWith('Kinetic Orange')
})
```

- [ ] **Step 3: Run test — verify it fails**

```bash
npx vitest run components/pitch/__tests__/theme-grid.test.tsx
```
Expected: FAIL

- [ ] **Step 4: Create components/pitch/theme-grid.tsx**

```tsx
'use client'
import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface Theme { id: string; name: string; thumbnailUrl: string; config: object }

export function ThemeGrid({ themes, onSelect }: { themes: Theme[]; onSelect: (id: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-2 gap-4">
      {themes.map((theme) => (
        <button
          key={theme.id}
          onClick={() => { setSelected(theme.id); onSelect(theme.id) }}
          className={cn(
            'border-2 p-1 text-left transition-all',
            selected === theme.id ? 'border-ko-orange' : 'border-[#333] hover:border-[#555]'
          )}
        >
          <div className="aspect-video bg-[#111] relative mb-2">
            <Image src={theme.thumbnailUrl} alt={theme.name} fill className="object-cover" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-white px-1 pb-1">{theme.name}</p>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
npx vitest run components/pitch/__tests__/theme-grid.test.tsx
```
Expected: PASS

- [ ] **Step 6: Create app/(app)/pitch/new/page.tsx**

```tsx
import { db } from '@/lib/db/client'
import { ThemeSelectorClient } from './theme-selector-client'

export default async function NewPitchPage({ searchParams }: { searchParams: { rfpId?: string } }) {
  const themes = await db.theme.findMany()

  return (
    <div className="p-6">
      <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange mb-2">// Step 2 of 2</p>
      <h1 className="font-archivo text-6xl uppercase tracking-tight4 leading-brutalist mb-8">
        Pick Your<br/>Theme
      </h1>
      <ThemeSelectorClient themes={themes} rfpId={searchParams.rfpId ?? ''} />
    </div>
  )
}
```

- [ ] **Step 7: Create app/(app)/pitch/new/theme-selector-client.tsx**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeGrid } from '@/components/pitch/theme-grid'
import { PillButton } from '@/components/ui/pill-button'

export function ThemeSelectorClient({ themes, rfpId }: { themes: any[]; rfpId: string }) {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleGenerate() {
    if (!selectedTheme || !rfpId) return
    setLoading(true)
    const res = await fetch('/api/pitch/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfpId, themeId: selectedTheme }),
    })
    const { pitchId } = await res.json()
    router.push(`/pitch/${pitchId}`)
  }

  return (
    <div className="space-y-8">
      <ThemeGrid themes={themes} onSelect={setSelectedTheme} />
      <PillButton onClick={handleGenerate} disabled={!selectedTheme || loading}>
        {loading ? 'Generating...' : 'Generate Pitch →'}
      </PillButton>
    </div>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: theme seed data, theme grid picker, and pitch/new page"
```

---

## Task 11: Inngest Pitch Generation Job + SSE Progress

**Files:**
- Modify: `lib/inngest/pitch-generate.ts` (replace stub)
- Create: `lib/ai/generate-pitch.ts`
- Create: `app/api/pitch/generate/route.ts`
- Create: `app/api/pitch/progress/[jobId]/route.ts`
- Create: `components/pitch/generation-progress.tsx`

- [ ] **Step 1: Write failing test for pitch generation prompt**

```ts
// lib/ai/__tests__/generate-pitch.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('../claude', () => ({
  claude: {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          executiveSummary: 'Team Liquid reaches 40M fans globally.',
          whyUs: 'We deliver ROI through integrated activations.',
          audienceReach: '18-34 male-skewing, 60% NA',
          deliverables: 'Logo on jersey + 3 social posts/month',
          pricing: '$600K for a 12-month partnership',
          timeline: 'Activation begins Q3 2026',
          cta: 'Let\'s build something iconic together.',
        }) }],
      }),
    },
  },
}))

import { generatePitchSections } from '../generate-pitch'

it('generates all required pitch sections', async () => {
  const result = await generatePitchSections({
    rfpData: { clientName: 'Red Bull', industry: 'Energy Drinks', budgetRange: '$500k-$1M', deliverables: [], timeline: 'Q3', targetAudience: 'Gamers', goals: [], successMetrics: [] },
    proposalContext: 'Past proposal: Team Liquid x BMW...',
  })
  expect(result.executiveSummary).toBeTruthy()
  expect(result.pricing).toBeTruthy()
  expect(result.cta).toBeTruthy()
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run lib/ai/__tests__/generate-pitch.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create lib/ai/generate-pitch.ts**

```ts
import { claude } from './claude'
import type { RfpData } from './extract-rfp'

export interface PitchSections {
  executiveSummary: string
  whyUs: string
  audienceReach: string
  deliverables: string
  pricing: string
  timeline: string
  cta: string
}

export async function generatePitchSections({
  rfpData,
  proposalContext,
}: {
  rfpData: RfpData
  proposalContext: string
}): Promise<PitchSections> {
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: 'You are an expert esports sponsorship pitch writer. Write compelling, specific, and data-driven pitch sections.',
    messages: [{
      role: 'user',
      content: `Write a sponsorship pitch for ${rfpData.clientName} (${rfpData.industry}).

RFP Details:
- Budget: ${rfpData.budgetRange}
- Deliverables wanted: ${rfpData.deliverables.join(', ')}
- Timeline: ${rfpData.timeline}
- Target Audience: ${rfpData.targetAudience}
- Goals: ${rfpData.goals.join(', ')}

Reference from our past successful proposals:
${proposalContext}

Return ONLY valid JSON matching this schema:
{
  "executiveSummary": string,
  "whyUs": string,
  "audienceReach": string,
  "deliverables": string,
  "pricing": string,
  "timeline": string,
  "cta": string
}`,
    }],
  })

  const raw = response.content[0]
  if (raw.type !== 'text') throw new Error('Unexpected response type from Claude')
  return JSON.parse(raw.text) as PitchSections
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run lib/ai/__tests__/generate-pitch.test.ts
```
Expected: PASS

- [ ] **Step 5: Replace stub in lib/inngest/pitch-generate.ts**

```ts
import { inngest } from './client'
import { db } from '@/lib/db/client'
import { retrieveSimilarProposals } from '@/lib/rag/retrieve'
import { generatePitchSections } from '@/lib/ai/generate-pitch'
import type { RfpData } from '@/lib/ai/extract-rfp'

export const pitchGenerateFunction = inngest.createFunction(
  { id: 'pitch-generate', name: 'Generate Pitch Sections' },
  { event: 'pitch/generate' },
  async ({ event, step }) => {
    const { pitchId, orgClerkId } = event.data

    await step.run('mark-running', async () => {
      await db.pitch.update({ where: { id: pitchId }, data: { status: 'RUNNING' } })
    })

    const pitch = await step.run('load-pitch', async () => {
      return db.pitch.findUniqueOrThrow({
        where: { id: pitchId },
        include: { rfp: true },
      })
    })

    const rfpData = pitch.rfp.extractedJson as RfpData

    const similarProposals = await step.run('retrieve-proposals', async () => {
      return retrieveSimilarProposals(orgClerkId, `${rfpData.clientName} ${rfpData.industry} ${rfpData.goals.join(' ')}`)
    })

    const proposalContext = similarProposals.map((p) => `- ${p.fileName} (similarity: ${p.similarity.toFixed(2)})`).join('\n')

    const sections = await step.run('generate-with-claude', async () => {
      return generatePitchSections({ rfpData, proposalContext })
    })

    await step.run('save-and-create-deck', async () => {
      await db.pitch.update({ where: { id: pitchId }, data: { status: 'DONE', sections: sections as object } })
      await db.deck.create({ data: { pitchId } })
    })
  }
)
```

- [ ] **Step 6: Create app/api/pitch/generate/route.ts**

```ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { inngest } from '@/lib/inngest/client'

export async function POST(req: NextRequest) {
  const { userId, orgId } = auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rfpId, themeId } = await req.json()
  if (!rfpId || !themeId) return NextResponse.json({ error: 'rfpId and themeId required' }, { status: 400 })

  const org = await db.org.findUniqueOrThrow({ where: { clerkOrgId: orgId } })

  const pitch = await db.pitch.create({
    data: { orgId: org.id, rfpId, themeId, status: 'PENDING' },
  })

  const { ids } = await inngest.send({ name: 'pitch/generate', data: { pitchId: pitch.id, orgClerkId: orgId } })

  await db.pitch.update({ where: { id: pitch.id }, data: { inngestJobId: ids[0] } })

  return NextResponse.json({ pitchId: pitch.id }, { status: 201 })
}
```

- [ ] **Step 7: Create components/pitch/generation-progress.tsx**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'

export function GenerationProgress({ pitchId, initialStatus }: { pitchId: string; initialStatus: Status }) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const router = useRouter()

  useEffect(() => {
    if (status === 'DONE' || status === 'FAILED') return

    const interval = setInterval(async () => {
      const res = await fetch(`/api/pitch/progress/${pitchId}`)
      const data = await res.json()
      setStatus(data.status)
      if (data.status === 'DONE') {
        clearInterval(interval)
        router.refresh()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [pitchId, status, router])

  if (status === 'DONE') return null

  return (
    <div className="border border-[#222] p-6 my-8">
      <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange animate-pulse mb-2">
        // Claude is generating your pitch...
      </p>
      <div className="h-0.5 bg-[#222] relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-ko-orange animate-[marquee_2s_linear_infinite] w-1/3" />
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Create app/api/pitch/progress/[jobId]/route.ts**

```ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'

export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pitch = await db.pitch.findUnique({ where: { id: params.jobId }, select: { status: true } })
  if (!pitch) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ status: pitch.status })
}
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: pitch generation Inngest job, Claude generation, polling progress UI"
```

---

## Task 12: Read-Only Deck View + Share Link

**Files:**
- Create: `components/deck/slide-view.tsx`
- Create: `app/(app)/pitch/[id]/page.tsx`
- Create: `app/deck/[token]/page.tsx`
- Create: `app/api/deck/[token]/route.ts`

- [ ] **Step 1: Write failing test for SlideView**

```tsx
// components/deck/__tests__/slide-view.test.tsx
import { render, screen } from '@testing-library/react'
import { SlideView } from '../slide-view'

const sections = {
  executiveSummary: 'We reach 40M fans globally.',
  whyUs: 'ROI-driven activations.',
  audienceReach: '18-34 gamers',
  deliverables: 'Logo + 3 posts/month',
  pricing: '$600K for 12 months',
  timeline: 'Q3 2026 start',
  cta: 'Let\'s build something iconic.',
}

test('renders executive summary slide', () => {
  render(<SlideView sections={sections} themeName="Kinetic Orange" />)
  expect(screen.getByText(/40M fans/i)).toBeInTheDocument()
})

test('renders CTA slide', () => {
  render(<SlideView sections={sections} themeName="Kinetic Orange" />)
  expect(screen.getByText(/iconic/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run components/deck/__tests__/slide-view.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create components/deck/slide-view.tsx**

```tsx
import type { PitchSections } from '@/lib/ai/generate-pitch'

const SLIDE_LABELS: Record<keyof PitchSections, string> = {
  executiveSummary: 'Executive Summary',
  whyUs: 'Why Us',
  audienceReach: 'Audience',
  deliverables: 'What You Get',
  pricing: 'Investment',
  timeline: 'Timeline',
  cta: 'Let\'s Talk',
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
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run components/deck/__tests__/slide-view.test.tsx
```
Expected: PASS

- [ ] **Step 5: Create app/(app)/pitch/[id]/page.tsx**

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { SlideView } from '@/components/deck/slide-view'
import { GenerationProgress } from '@/components/pitch/generation-progress'
import { PublishButton } from './publish-button'
import type { PitchSections } from '@/lib/ai/generate-pitch'

export default async function PitchDetailPage({ params }: { params: { id: string } }) {
  const { orgId } = auth()
  if (!orgId) redirect('/sign-in')

  const pitch = await db.pitch.findUnique({
    where: { id: params.id },
    include: { theme: true, deck: true },
  })
  if (!pitch) notFound()

  const sections = pitch.sections as PitchSections | null

  return (
    <div className="p-6">
      <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange mb-2">// Pitch Deck</p>
      <div className="flex items-end justify-between mb-8 border-b-2 border-[#222] pb-4">
        <h1 className="font-archivo text-5xl uppercase tracking-tight4 leading-brutalist">
          {pitch.theme.name}
        </h1>
        {pitch.deck && <PublishButton pitchId={pitch.id} shareToken={pitch.deck.shareToken} isPublished={!!pitch.deck.publishedAt} />}
      </div>

      <GenerationProgress pitchId={pitch.id} initialStatus={pitch.status as any} />

      {sections && <SlideView sections={sections} themeName={pitch.theme.name} />}
    </div>
  )
}
```

- [ ] **Step 6: Create app/(app)/pitch/[id]/publish-button.tsx**

```tsx
'use client'
import { useState } from 'react'
import { PillButton } from '@/components/ui/pill-button'

export function PublishButton({ pitchId, shareToken, isPublished }: { pitchId: string; shareToken: string; isPublished: boolean }) {
  const [published, setPublished] = useState(isPublished)
  const shareUrl = `${window.location.origin}/deck/${shareToken}`

  async function handlePublish() {
    await fetch(`/api/deck/${shareToken}`, { method: 'POST' })
    setPublished(true)
  }

  if (published) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-mono text-[9px] uppercase tracking-tight2 text-ko-orange border border-ko-orange px-2 py-0.5">Live</span>
        <button
          onClick={() => navigator.clipboard.writeText(shareUrl)}
          className="font-mono text-[9px] uppercase tracking-tight2 text-[#555] hover:text-ko-white transition-colors"
        >
          Copy Link
        </button>
      </div>
    )
  }

  return <PillButton onClick={handlePublish}>Publish & Share →</PillButton>
}
```

- [ ] **Step 7: Create app/api/deck/[token]/route.ts**

```ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'

// GET — public deck data (no auth required)
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const deck = await db.deck.findUnique({
    where: { shareToken: params.token },
    include: { pitch: { include: { theme: true } } },
  })

  if (!deck || !deck.publishedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    sections: deck.pitch.sections,
    themeName: deck.pitch.theme.name,
  })
}

// POST — publish deck (auth required)
export async function POST(_req: NextRequest, { params }: { params: { token: string } }) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.deck.update({
    where: { shareToken: params.token },
    data: { publishedAt: new Date() },
  })

  return NextResponse.json({ published: true })
}
```

- [ ] **Step 8: Create app/deck/[token]/page.tsx**

```tsx
import { notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { SlideView } from '@/components/deck/slide-view'
import type { PitchSections } from '@/lib/ai/generate-pitch'

export default async function PublicDeckPage({ params }: { params: { token: string } }) {
  const deck = await db.deck.findUnique({
    where: { shareToken: params.token },
    include: { pitch: { include: { theme: true } } },
  })

  if (!deck || !deck.publishedAt) notFound()

  const sections = deck.pitch.sections as PitchSections

  return (
    <div className="min-h-screen bg-ko-black">
      <div className="border-b-2 border-[#222] p-4 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange">// Pitcher</p>
        <p className="font-mono text-[10px] uppercase tracking-tight2 text-[#555]">Sponsorship Proposal</p>
      </div>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <SlideView sections={sections} themeName={deck.pitch.theme.name} />
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: read-only deck view, publish flow, and public share link"
```

---

## Task 13: Dashboard Page

**Files:**
- Create: `app/(app)/dashboard/page.tsx`
- Create: `components/ui/marquee.tsx`

- [ ] **Step 1: Create components/ui/marquee.tsx**

```tsx
export function Marquee({ items }: { items: string[] }) {
  const doubled = [...items, ...items]
  return (
    <div className="overflow-hidden border-y-2 border-ko-black bg-ko-orange py-2.5" style={{ transform: 'skewY(-1deg)' }}>
      <div className="flex gap-8 whitespace-nowrap" style={{ animation: 'marquee 20s linear infinite' }}>
        {doubled.map((item, i) => (
          <span key={i} className="font-archivo text-lg uppercase tracking-tight4 text-ko-black shrink-0">
            {item} <span className="opacity-40">◆</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  )
}
```

- [ ] **Step 2: Create app/(app)/dashboard/page.tsx**

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'
import { Marquee } from '@/components/ui/marquee'
import { PillButton } from '@/components/ui/pill-button'
import Link from 'next/link'

export default async function DashboardPage() {
  const { orgId } = auth()
  if (!orgId) redirect('/sign-in')

  const org = await db.org.findUnique({ where: { clerkOrgId: orgId } })

  const [rfpCount, pitchCount, deckCount] = await Promise.all([
    org ? db.rFP.count({ where: { orgId: org.id } }) : 0,
    org ? db.pitch.count({ where: { orgId: org.id } }) : 0,
    org ? db.deck.count({ where: { pitch: { orgId: org.id } } }) : 0,
  ])

  return (
    <div>
      <div className="p-6 border-b-2 border-[#222]">
        <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange mb-1">// Pitcher — Esports Sponsorship OS</p>
        <h1 className="font-archivo text-8xl uppercase tracking-tight4 leading-brutalist">
          Win<br/>Every<br/><span className="text-ko-orange">Deal.</span>
        </h1>
        <div className="flex gap-8 mt-6 pt-6 border-t-2 border-[#222]">
          {[
            { num: rfpCount, label: 'RFPs Analyzed' },
            { num: pitchCount, label: 'Pitches Generated' },
            { num: deckCount, label: 'Decks Shared' },
          ].map(({ num, label }) => (
            <div key={label}>
              <p className="font-archivo text-5xl text-ko-orange tracking-tight4">{String(num).padStart(2, '0')}</p>
              <p className="font-mono text-[9px] uppercase tracking-tight2 text-[#555]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <Marquee items={['RFP Analyzer', 'Pitch Generator', 'Deck Maker', 'Export & Share']} />

      <div className="p-6">
        <p className="font-mono text-[10px] uppercase tracking-tight2 text-[#555] mb-4">// Workflow</p>
        {[
          { num: '01', title: 'Upload RFP', href: '/rfp', tag: 'Start Here' },
          { num: '02', title: 'Select Theme', href: '/pitch/new', tag: 'Then' },
          { num: '03', title: 'Generate Pitch', href: '/pitch/new', tag: 'Then' },
          { num: '04', title: 'Share Deck', href: '/pitch', tag: 'Done' },
        ].map(({ num, title, href, tag }) => (
          <Link key={num} href={href} className="flex items-center gap-4 py-4 border-b border-[#222] hover:pl-4 transition-all group">
            <span className="font-mono text-[10px] text-ko-orange">{num}</span>
            <span className="font-archivo text-3xl uppercase tracking-tight4 group-hover:translate-x-4 transition-transform">{title}</span>
            <span className="ml-auto font-mono text-[9px] uppercase tracking-tight2 border border-[#333] text-[#555] px-2 py-0.5 rounded-full">{tag}</span>
          </Link>
        ))}

        <div className="mt-12 text-center">
          <Link href="/rfp">
            <PillButton>Upload First RFP →</PillButton>
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: dashboard with stats, marquee, and workflow pipeline"
```

---

## Self-Review Checklist

**Spec coverage:**

| Spec requirement | Covered in task |
|---|---|
| Org auth with roles (Admin/Pitcher/Viewer) | Task 4 (Clerk middleware) |
| RFP upload (PDF/DOCX) | Task 6 + 8 |
| Inngest background parsing | Task 7 |
| Claude RFP extraction | Task 7 |
| Extracted JSON review UI | Task 8 |
| Old Proposals RAG indexing | Task 9 |
| Theme selector (4 seeded themes) | Task 10 |
| Inngest pitch generation | Task 11 |
| RAG retrieval during generation | Task 11 |
| Claude pitch generation | Task 11 |
| Generation progress UI | Task 11 |
| Read-only HTML deck view | Task 12 |
| Share link (public /deck/[token]) | Task 12 |
| Dashboard stats | Task 13 |
| Kinetic Orange design system | Task 2 + 5 |

**Viewer/Admin role enforcement:** Clerk middleware protects all `/app/` routes by requiring auth. Role-level enforcement (Viewer cannot create) is deferred to Phase 3 as specified in the spec MVP scope.

All spec Phase 1 requirements are covered.
