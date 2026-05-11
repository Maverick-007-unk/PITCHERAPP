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
