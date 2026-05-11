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
      try {
        const res = await fetch(`/api/pitch/progress/${pitchId}`)
        const data = await res.json()
        setStatus(data.status)
        if (data.status === 'DONE') {
          clearInterval(interval)
          router.refresh()
        }
      } catch {
        // Ignore polling errors — will retry on next interval
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [pitchId, status, router])

  if (status === 'DONE') return null

  return (
    <div className="border border-[#222] p-6 my-8">
      <p className="font-mono text-[10px] uppercase tracking-tight2 text-ko-orange animate-pulse mb-2">
        {status === 'FAILED' ? '// Generation failed — please try again' : '// Claude is generating your pitch...'}
      </p>
      {status !== 'FAILED' && (
        <div className="h-0.5 bg-[#222] relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-ko-orange w-1/3" style={{ animation: 'marquee 2s linear infinite' }} />
        </div>
      )}
    </div>
  )
}
