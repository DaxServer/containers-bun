import { haversineDistance } from '@/utils/geo'
import { describe, expect, it } from 'bun:test'

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistance(0, 0, 0, 0)).toBe(0)
  })

  it('returns ~111km for 1 degree latitude difference at equator', () => {
    const dist = haversineDistance(0, 0, 1, 0)
    expect(dist).toBeGreaterThan(110_000)
    expect(dist).toBeLessThan(112_000)
  })

  it('returns ~111km for 1 degree longitude difference at equator', () => {
    const dist = haversineDistance(0, 0, 0, 1)
    expect(dist).toBeGreaterThan(110_000)
    expect(dist).toBeLessThan(112_000)
  })

  it('is symmetric', () => {
    const d1 = haversineDistance(48.8566, 2.3522, 51.5074, -0.1278)
    const d2 = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522)
    expect(Math.abs(d1 - d2)).toBeLessThan(0.001)
  })

  it('returns ~343km for Paris to London', () => {
    // Paris: 48.8566°N, 2.3522°E; London: 51.5074°N, 0.1278°W
    const dist = haversineDistance(48.8566, 2.3522, 51.5074, -0.1278)
    expect(dist).toBeGreaterThan(340_000)
    expect(dist).toBeLessThan(346_000)
  })
})
