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
      <div className="font-archivo text-[11px] text-ko-orange uppercase tracking-tight4 border-2 border-ko-orange px-1 py-1.5 mb-3">
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
