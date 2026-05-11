import { describe, it, expect, vi } from 'vitest'

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function () {
    return { send: vi.fn() }
  }),
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
