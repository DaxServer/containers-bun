import { buildStatementsFromMapillaryImage } from '@backend/mediawiki/sdc'
import { describe, expect, it } from 'bun:test'
import type { MediaImage } from '@backend/types/ws'

const baseImage: MediaImage = {
  id: 'img123',
  title: 'test.jpg',
  dates: { taken: '2023-06-15T10:30:00Z' },
  creator: { id: 'u1', username: 'testuser', profile_url: 'https://example.com' },
  location: { latitude: 48.85, longitude: 2.35, compass_angle: null },
  urls: {
    url: 'https://example.com/img',
    original: 'https://example.com/img',
    preview: 'https://example.com/img',
    thumbnail: 'https://example.com/img',
  },
  dimensions: { width: 1920, height: 1080 },
  camera: { make: null, model: null, is_pano: false },
  existing: [],
}

type AnyClaim = { mainsnak: { datavalue?: { value?: { time?: string } } } }

describe('buildStatementsFromMapillaryImage / timeSnak', () => {
  it('produces the correct Wikidata time string for a Z-suffix date', () => {
    const claims = buildStatementsFromMapillaryImage(baseImage, false) as AnyClaim[]
    const inceptionClaim = claims.find((c) => c.mainsnak?.datavalue?.value?.time !== undefined)
    expect(inceptionClaim?.mainsnak?.datavalue?.value?.time).toBe('+00000002023-06-15T00:00:00Z')
  })

  it('throws a descriptive error for an invalid date string', () => {
    const bad = { ...baseImage, dates: { taken: 'not-a-date' } }
    expect(() => buildStatementsFromMapillaryImage(bad, false)).toThrow(
      'Invalid date provided for SDC: not-a-date',
    )
  })
})
