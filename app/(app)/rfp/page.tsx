import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'
import { RfpUploadClient } from './rfp-upload-client'
import Link from 'next/link'

export default async function RfpPage() {
  const { orgId } = await auth()
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
        {rfps.map((rfp: { id: string; status: string; fileName: string }) => (
          <Link key={rfp.id} href={`/rfp/${rfp.id}`} className="flex items-center gap-4 py-4 border-b border-[#222] hover:pl-4 transition-all group">
            <span className="font-mono text-[10px] text-ko-orange uppercase">{rfp.status}</span>
            <span className="font-archivo text-2xl uppercase tracking-tight4 group-hover:text-ko-orange transition-colors">{rfp.fileName}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
