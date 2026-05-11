import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { RfpSummaryCard } from '@/components/rfp/rfp-summary-card'
import { PillButton } from '@/components/ui/pill-button'
import Link from 'next/link'
import type { RfpData } from '@/lib/ai/extract-rfp'

export default async function RfpDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth()
  if (!orgId) redirect('/sign-in')

  const { id } = await params

  const rfp = await db.rFP.findUnique({ where: { id } })
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
