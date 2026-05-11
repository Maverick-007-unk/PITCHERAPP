import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'
import { Marquee } from '@/components/ui/marquee'
import { PillButton } from '@/components/ui/pill-button'
import Link from 'next/link'

export default async function DashboardPage() {
  const { orgId } = await auth()
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
          { num: '04', title: 'Share Deck', href: '/rfp', tag: 'Done' },
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
