import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-ko-black text-ko-white flex flex-col">
      {/* Nav */}
      <header className="border-b-2 border-[#222] px-8 py-4 flex items-center justify-between">
        <div className="font-archivo text-[13px] text-ko-orange uppercase tracking-tight4 border-2 border-ko-orange px-2 py-1">
          PITCHER
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/sign-in" className="font-mono text-[10px] uppercase tracking-tight2 text-[#555] hover:text-ko-white transition-colors">
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="font-mono text-[10px] uppercase tracking-tight2 bg-ko-orange text-ko-black px-4 py-2 hover:bg-ko-white transition-colors"
          >
            Get Started →
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col justify-center px-8 py-20 border-b-2 border-[#222]">
        <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange mb-4">
          // Esports Sponsorship OS
        </p>
        <h1 className="font-archivo text-[clamp(4rem,12vw,10rem)] uppercase tracking-tight4 leading-brutalist mb-8">
          Win<br />Every<br /><span className="text-ko-orange">Deal.</span>
        </h1>
        <p className="font-sans text-lg text-[#888] max-w-md leading-relaxed mb-10">
          Upload a client RFP, pick a theme, and let Claude generate a tailored sponsorship pitch deck in minutes — ready to present or export.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-up"
            className="font-mono text-[11px] uppercase tracking-tight2 bg-ko-orange text-ko-black px-6 py-3 hover:bg-ko-white transition-colors font-bold"
          >
            Start Pitching →
          </Link>
          <Link
            href="/sign-in"
            className="font-mono text-[11px] uppercase tracking-tight2 border-2 border-[#333] text-[#555] px-6 py-3 hover:border-ko-white hover:text-ko-white transition-colors"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-b-2 border-[#222] overflow-hidden">
        <div className="flex divide-x-2 divide-[#222]">
          {[
            { num: '01', label: 'Upload RFP', desc: 'Drop in any PDF or DOCX — Claude extracts every requirement automatically.' },
            { num: '02', label: 'Select Theme', desc: 'Choose from purpose-built esports deck themes with your brand in mind.' },
            { num: '03', label: 'Generate Pitch', desc: 'AI writes every section — exec summary, deliverables, pricing, timeline.' },
            { num: '04', label: 'Export & Share', desc: 'Publish a live link or download PDF / PPTX to close the deal.' },
          ].map(({ num, label, desc }) => (
            <div key={num} className="flex-1 p-8 min-w-0">
              <span className="font-mono text-[9px] text-ko-orange uppercase tracking-tight2 mb-3 block">{num}</span>
              <h3 className="font-archivo text-2xl uppercase tracking-tight4 mb-3">{label}</h3>
              <p className="font-sans text-[13px] text-[#666] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof / stats */}
      <section className="px-8 py-16 border-b-2 border-[#222] flex items-center gap-16">
        {[
          { value: '3×', label: 'Faster than manual decks' },
          { value: '7', label: 'Slide sections generated' },
          { value: '100%', label: 'Tailored to each RFP' },
        ].map(({ value, label }) => (
          <div key={label}>
            <p className="font-archivo text-6xl text-ko-orange tracking-tight4">{value}</p>
            <p className="font-mono text-[9px] uppercase tracking-tight2 text-[#555] mt-1">{label}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="px-8 py-20 text-center">
        <p className="font-mono text-[10px] uppercase tracking-tight2 text-[#555] mb-4">// Ready?</p>
        <h2 className="font-archivo text-[clamp(3rem,8vw,7rem)] uppercase tracking-tight4 leading-brutalist mb-8">
          Close More<br /><span className="text-ko-orange">Sponsors.</span>
        </h2>
        <Link
          href="/sign-up"
          className="inline-block font-mono text-[11px] uppercase tracking-tight2 bg-ko-orange text-ko-black px-8 py-4 hover:bg-ko-white transition-colors font-bold"
        >
          Get Started Free →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-[#222] px-8 py-6 flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-tight2 text-[#444]">
          PITCHER — Esports Sponsorship OS
        </p>
        <p className="font-mono text-[9px] uppercase tracking-tight2 text-[#333]">
          {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}
