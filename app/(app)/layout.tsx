import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/ui/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')
  if (!orgId) redirect('/sign-in')

  return (
    <div className="flex min-h-screen bg-ko-black">
      <Sidebar />
      <main className="ml-14 flex-1">{children}</main>
    </div>
  )
}
