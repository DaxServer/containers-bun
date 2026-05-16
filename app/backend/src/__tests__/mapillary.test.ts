import { fromMapillary } from '@backend/handlers/mapillary'
import { describe, expect, it } from 'bun:test'

const BASE = {
  id: 'img123',
  geometry: { type: 'Point', coordinates: [-73.985, 40.748] as [number, number] },
  creator: { id: 'u1', username: 'alice' },
  captured_at: 1_700_000_000_000,
  compass_angle: 90,
  thumb_original_url: 'https://example.com/orig.jpg',
  thumb_1024_url: 'https://example.com/1024.jpg',
  thumb_256_url: 'https://example.com/256.jpg',
  width: 4000,
  height: 3000,
  is_pano: false,
  make: 'Sony',
  model: 'RX1',
}

describe('fromMapillary', () => {
  it('converts a full image record correctly', () => {
    const result = fromMapillary(BASE)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('img123')
    expect(result!.creator.username).toBe('alice')
    expect(result!.location.longitude).toBe(-73.985)
    expect(result!.location.latitude).toBe(40.748)
    expect(result!.location.compass_angle).toBe(90)
    expect(result!.camera.make).toBe('Sony')
    expect(result!.camera.model).toBe('RX1')
    expect(result!.camera.is_pano).toBe(false)
    expect(result!.dimensions.width).toBe(4000)
    expect(result!.dimensions.height).toBe(3000)
    expect(result!.urls.original).toBe('https://example.com/orig.jpg')
    expect(result!.urls.preview).toBe('https://example.com/1024.jpg')
    expect(result!.urls.thumbnail).toBe('https://example.com/256.jpg')
    expect(result!.existing).toEqual([])
  })

  it('builds title from date and id', () => {
    const result = fromMapillary(BASE)
    const date = new Date(Math.floor(BASE.captured_at / 1000) * 1000).toISOString().slice(0, 10)
    expect(result!.title).toBe(`Photo from Mapillary ${date} (img123).jpg`)
  })

  it('clamps compass_angle=0 to null', () => {
    const result = fromMapillary({ ...BASE, compass_angle: 0 })
    expect(result!.location.compass_angle).toBeNull()
  })

  it('clamps compass_angle=360 to null', () => {
    const result = fromMapillary({ ...BASE, compass_angle: 360 })
    expect(result!.location.compass_angle).toBeNull()
  })

  it('keeps valid compass_angle=359', () => {
    const result = fromMapillary({ ...BASE, compass_angle: 359 })
    expect(result!.location.compass_angle).toBe(359)
  })

  it('strips make="none" to null', () => {
    const result = fromMapillary({ ...BASE, make: 'none' })
    expect(result!.camera.make).toBeNull()
  })

  it('strips model="none" to null', () => {
    const result = fromMapillary({ ...BASE, model: 'none' })
    expect(result!.camera.model).toBeNull()
  })

  it('returns null when geometry is missing', () => {
    const result = fromMapillary({ ...BASE, geometry: null as never })
    expect(result).toBeNull()
  })

  it('returns null when coords has fewer than 2 elements', () => {
    const result = fromMapillary({
      ...BASE,
      geometry: { type: 'Point', coordinates: [-73.985] as never },
    })
    expect(result).toBeNull()
  })

  it('returns null when creator is missing', () => {
    const result = fromMapillary({ ...BASE, creator: null as never })
    expect(result).toBeNull()
  })

  it('returns null when captured_at is null', () => {
    const result = fromMapillary({ ...BASE, captured_at: null as never })
    expect(result).toBeNull()
  })

  it('falls back to "Unknown" when creator username is missing', () => {
    const result = fromMapillary({ ...BASE, creator: { id: 'u1', username: null as never } })
    expect(result!.creator.username).toBe('Unknown')
  })

  it('millisecond timestamp is floored to nearest second', () => {
    const result = fromMapillary({ ...BASE, captured_at: 1_700_000_000_999 })
    expect(result!.dates.taken).toBe(new Date(1_700_000_000_000).toISOString())
  })
})
