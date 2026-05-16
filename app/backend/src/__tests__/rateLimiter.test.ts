import { getNextUploadDelay } from '@backend/core/rateLimiter'
import { describe, expect, it, mock } from 'bun:test'
import type { Redis } from 'ioredis'

function makeRedisMock(nextAvailable: string | null = null) {
  return {
    get: mock(async () => nextAvailable),
    set: mock(async () => 'OK' as const),
  } as unknown as Redis & { set: ReturnType<typeof mock>; get: ReturnType<typeof mock> }
}

describe('getNextUploadDelay', () => {
  it('returns the existing delay without updating Redis when uploadsPerPeriod is 0', async () => {
    const redis = makeRedisMock()
    const delay = await getNextUploadDelay('u1', { uploadsPerPeriod: 0, periodSeconds: 60 }, redis)
    expect(delay).toBe(0)
    expect((redis as any).set).not.toHaveBeenCalled()
  })

  it('returns a non-zero delay and skips Redis update when next_available is in the future and uploadsPerPeriod is 0', async () => {
    const futureTs = String(Date.now() / 1000 + 30)
    const redis = makeRedisMock(futureTs)
    const delay = await getNextUploadDelay('u1', { uploadsPerPeriod: 0, periodSeconds: 60 }, redis)
    expect(delay).toBeGreaterThan(0)
    expect((redis as any).set).not.toHaveBeenCalled()
  })

  it('updates Redis next_available when uploadsPerPeriod is non-zero', async () => {
    const redis = makeRedisMock()
    await getNextUploadDelay('u1', { uploadsPerPeriod: 10, periodSeconds: 60 }, redis)
    expect((redis as any).set).toHaveBeenCalledTimes(1)
    const [key, value] = (redis as any).set.mock.calls[0] as [string, string]
    expect(key).toContain('u1')
    expect(Number(value)).toBeGreaterThan(Date.now() / 1000)
  })
})
