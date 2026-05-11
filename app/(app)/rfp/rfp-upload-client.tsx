'use client'
import { useRouter } from 'next/navigation'
import { UploadZone } from '@/components/rfp/upload-zone'

export function RfpUploadClient() {
  const router = useRouter()

  async function handleUpload(file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/rfp', { method: 'POST', body: form })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? 'Upload failed')
    }
    const body = await res.json()
    if (!body.rfpId) throw new Error('Invalid response from server')
    router.push(`/rfp/${body.rfpId}`)
  }

  return <UploadZone onUpload={handleUpload} />
}
