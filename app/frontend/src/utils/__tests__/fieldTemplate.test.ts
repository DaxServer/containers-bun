import type { Image } from '@/types/image'
import { describe, expect, it } from 'bun:test'
import { applyFieldTemplate } from '../titleTemplate'

describe('applyFieldTemplate', () => {
  const mockImage: Image = {
    id: 'img_123',
    title: 'Original Title',
    description: 'Original Description',
    urls: {
      url: 'http://example.com/image.jpg',
      original: 'http://example.com/original.jpg',
      preview: 'http://example.com/preview.jpg',
      thumbnail: 'http://example.com/thumbnail.jpg',
    },
    dimensions: { width: 1920, height: 1080 },
    dates: { taken: new Date('2023-12-25T14:30:45.123Z') },
    location: {
      latitude: 12.3456,
      longitude: -98.7654,
      compass_angle: 180.5,
      city: 'Berlin',
      country: 'Germany',
    },
    creator: { id: 'user_456', username: 'test_user', profile_url: '' },
    camera: { make: 'Canon', model: 'EOS', is_pano: false },
    existing: [],
  }

  it('substitutes a known variable token', () => {
    const result = applyFieldTemplate('Photo in {{location.city}}', mockImage, 'seq1')
    expect(result).toBe('Photo in Berlin')
  })

  it('substitutes multiple known tokens', () => {
    const result = applyFieldTemplate('{{location.city}}, {{location.country}}', mockImage, 'seq1')
    expect(result).toBe('Berlin, Germany')
  })

  it('leaves unknown tokens untouched (wikitext passthrough)', () => {
    const result = applyFieldTemplate('{{Creator|John}} in {{location.city}}', mockImage, 'seq1')
    expect(result).toBe('{{Creator|John}} in Berlin')
  })

  it('leaves all content unchanged when no tokens present', () => {
    const result = applyFieldTemplate('Plain text description', mockImage, 'seq1')
    expect(result).toBe('Plain text description')
  })

  it('handles wikitext template alongside known variables', () => {
    const result = applyFieldTemplate(
      '[[Category:Photos in {{location.city}}]]\n{{Taken on|2023}}',
      mockImage,
      'seq1',
    )
    expect(result).toBe('[[Category:Photos in Berlin]]\n{{Taken on|2023}}')
  })

  it('substitutes captured date fields', () => {
    const result = applyFieldTemplate('Taken on {{captured.date}}', mockImage, 'seq1')
    expect(result).toBe('Taken on 2023-12-25')
  })

  it('substitutes sequence', () => {
    const result = applyFieldTemplate('Seq: {{mapillary.photo.sequence}}', mockImage, 'seq_abc')
    expect(result).toBe('Seq: seq_abc')
  })

  it('returns empty string unchanged', () => {
    const result = applyFieldTemplate('', mockImage, 'seq1')
    expect(result).toBe('')
  })

  it('handles token with whitespace around path', () => {
    const result = applyFieldTemplate('{{ location.city }}', mockImage, 'seq1')
    expect(result).toBe('Berlin')
  })
})
