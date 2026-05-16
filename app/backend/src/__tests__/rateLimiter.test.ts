import { getNextUploadDelay } from '@backend/core/rateLimiter'
import { describe, expect, it, mock } from 'bun:test'
import type { Redis } from 'ioredis'

function makeRedisMock(nextAvailable: string | null = null) {
  const setMock = mock(async () => 'OK' as const)
  const getMock = mock(async () => nextAvailable)
  const redis = { get: getMock, set: setMock } as unknown as Redis
  return { redis, setMock, getMock }
}

describe('getNextUploadDelay', () => {
  it('returns the existing delay without updating Redis when uploadsPerPeriod is 0', async () => {
    const { redis, setMock } = makeRedisMock()
    const delay = await getNextUploadDelay('u1', { uploadsPerPeriod: 0, periodSeconds: 60 }, redis)
    expect(delay).toBe(0)
    expect(setMock).not.toHaveBeenCalled()
  })

  it('returns a non-zero delay and skips Redis update when next_available is in the future and uploadsPerPeriod is 0', async () => {
    const futureTs = String(Date.now() / 1000 + 30)
    const { redis, setMock } = makeRedisMock(futureTs)
    const delay = await getNextUploadDelay('u1', { uploadsPerPeriod: 0, periodSeconds: 60 }, redis)
    expect(delay).toBeGreaterThan(0)
    expect(setMock).not.toHaveBeenCalled()
  })

  it('updates Redis next_available when uploadsPerPeriod is non-zero', async () => {
    const { redis, setMock } = makeRedisMock()
    await getNextUploadDelay('u1', { uploadsPerPeriod: 10, periodSeconds: 60 }, redis)
    expect(setMock).toHaveBeenCalledTimes(1)
    const [key, value] = setMock.mock.calls[0] as [string, string]
    expect(key).toContain('u1')
    expect(Number(value)).toBeGreaterThan(Date.now() / 1000)
  })
})
