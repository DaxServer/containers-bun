import type { Image } from '@/types/image'
import { describe, expect, it } from 'bun:test'
import {
  applyTitleTemplate,
  CAMERA_FIELD_PATHS,
  extractUsedCameraFields,
  extractUsedOptionalFields,
  hasMissingCameraFields,
  hasMissingOptionalFields,
  isValidExtension,
  OPTIONAL_FIELD_PATHS,
  OPTIONAL_LOCATION_FIELD_PATHS,
  VALID_EXTENSIONS,
  validateTemplate,
} from '../titleTemplate'

describe('titleTemplate utils', () => {
  const createMockImage = (id: string): Image => ({
    id,
    title: 'Original Title',
    description: 'Original Description',
    urls: {
      url: 'http://example.com/image.jpg',
      original: 'http://example.com/original.jpg',
      preview: 'http://example.com/preview.jpg',
      thumbnail: 'http://example.com/thumbnail.jpg',
    },
    dimensions: { width: 100, height: 100 },
    dates: { taken: new Date('2023-01-01T00:00:00Z') },
    location: { latitude: 0, longitude: 0, compass_angle: 0 },
    creator: { id: 'user', username: 'user', profile_url: '' },
    camera: { make: undefined, model: undefined, is_pano: false },
    existing: [],
  })

  describe('applyTitleTemplate', () => {
    it('replaces tokens correctly', () => {
      const image = createMockImage('1')
      const template = 'Photo by {{mapillary.user.username}} on {{captured.date}}'
      const result = applyTitleTemplate(template, image, 'seq123')
      expect(result).toBe('Photo by user on 2023-01-01')
    })

    it('handles missing values', () => {
      const image = createMockImage('1')
      // @ts-expect-error - forcing missing prop for test
      image.creator.username = undefined
      const template = 'Photo by {{mapillary.user.username}}'
      const result = applyTitleTemplate(template, image, 'seq123')
      expect(result).toBe('Photo by ')
    })

    it('ignores unknown tokens - Handlebars behavior', () => {
      const image = createMockImage('1')
      const template = 'Photo {{unknown.prop}}'
      const result = applyTitleTemplate(template, image, 'seq123')
      expect(result).toBe('Photo ')
    })

    it('handles whitespace in tokens', () => {
      const image = createMockImage('1')
      const template = 'Photo by {{ mapillary.user.username }}'
      const result = applyTitleTemplate(template, image, 'seq123')
      expect(result).toBe('Photo by user')
    })

    it('uses provided sequence', () => {
      const image = createMockImage('1')
      const template = 'Sequence: {{mapillary.photo.sequence}}'
      const result = applyTitleTemplate(template, image, 'test_sequence_id')
      expect(result).toBe('Sequence: test_sequence_id')
    })

    describe('Field substitutions', () => {
      // Create a specific image with all fields populated for testing
      const fullImage: Image = {
        ...createMockImage('img_123'),
        dimensions: { width: 1920, height: 1080 },
        // 2023-12-25 14:30:45.123 UTC
        dates: { taken: new Date('2023-12-25T14:30:45.123Z') },
        camera: { make: 'TestMake', model: 'TestModel', is_pano: false },
        location: {
          latitude: 12.3456,
          longitude: -98.7654,
          compass_angle: 180.5,
        },
        creator: {
          id: 'user_456',
          username: 'test_user',
          profile_url: '',
        },
      }
      const sequence = 'seq_789'

      const testCases = [
        ['{{mapillary.photo.id}}', 'img_123'],
        ['{{mapillary.photo.sequence}}', 'seq_789'],
        ['{{image.width}}', '1920'],
        ['{{image.height}}', '1080'],
        ['{{captured.date}}', '2023-12-25'],
        ['{{captured.time}}', '14H30M45S'],
        ['{{captured.time_ms}}', '14H30M45S123'],
        ['{{captured.year}}', '2023'],
        ['{{captured.month}}', '12'],
        ['{{captured.day_of_month}}', '25'],
        ['{{captured.hours}}', '14'],
        ['{{captured.minutes}}', '30'],
        ['{{captured.seconds}}', '45'],
        ['{{captured.milliseconds}}', '123'],
        ['{{captured.raw}}', '2023-12-25T14H30M45S123Z'],
        ['{{camera.make}}', 'TestMake'],
        ['{{camera.model}}', 'TestModel'],
        ['{{mapillary.user.id}}', 'user_456'],
        ['{{mapillary.user.username}}', 'test_user'],
        ['{{location.latitude}}', '12.3456'],
        ['{{location.longitude}}', '-98.7654'],
        ['{{location.compass_angle}}', '180.5'],
      ] as const

      it.each(testCases)('replaces %s with %s', (template, expected) => {
        expect(applyTitleTemplate(template, fullImage, sequence)).toBe(expected)
      })
    })
  })

  describe('validateTemplate', () => {
    it('returns valid for empty string', () => {
      expect(validateTemplate('').valid).toBe(true)
    })

    it('returns valid for valid template', () => {
      expect(validateTemplate('Photo by {{mapillary.user.username}}.jpg').valid).toBe(true)
    })

    it('detects mismatched braces', () => {
      const result = validateTemplate('Photo {{mapillary.user.username')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Mismatched syntax')
    })

    it('detects empty tags', () => {
      const result = validateTemplate('Photo {{}}')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Empty tag')
    })

    it('detects invalid characters', () => {
      const result = validateTemplate('Photo {{creator-username}}')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Unknown variable')
    })

    it('detects unknown variables', () => {
      const result = validateTemplate('Photo {{unknown.variable}}')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Unknown variable')
    })

    it('allows whitespace in valid variables', () => {
      expect(validateTemplate('Photo {{ mapillary.user.username }}.jpg').valid).toBe(true)
    })
  })

  describe('isValidExtension', () => {
    VALID_EXTENSIONS.forEach((ext) => {
      it(`returns true for valid extension ${ext}`, () => {
        expect(isValidExtension(`image.${ext}`)).toBe(true)
      })
    })

    it('returns false for empty string', () => {
      expect(isValidExtension('')).toBe(false)
    })
  })

  describe('extractUsedCameraFields', () => {
    it('returns empty array when no camera fields are used', () => {
      const template = 'Photo by {{mapillary.user.username}}.jpg'
      expect(extractUsedCameraFields(template)).toEqual([])
    })

    it('returns camera.make when used in template', () => {
      const template = 'Photo {{camera.make}}.jpg'
      expect(extractUsedCameraFields(template)).toEqual(['camera.make'])
    })

    it('returns camera.model when used in template', () => {
      const template = 'Photo {{camera.model}}.jpg'
      expect(extractUsedCameraFields(template)).toEqual(['camera.model'])
    })

    it('returns both camera fields when both are used', () => {
      const template = 'Photo {{camera.make}} {{camera.model}}.jpg'
      expect(extractUsedCameraFields(template)).toEqual(['camera.make', 'camera.model'])
    })

    it('handles whitespace in template variables', () => {
      const template = 'Photo {{ camera.make }}.jpg'
      expect(extractUsedCameraFields(template)).toEqual(['camera.make'])
    })
  })

  describe('hasMissingCameraFields', () => {
    it('returns false when no fields are checked', () => {
      const image = createMockImage('1')
      expect(hasMissingCameraFields(image, [])).toBe(false)
    })

    it('returns true when camera.make is missing and checked', () => {
      const image = createMockImage('1')
      image.camera.make = undefined as unknown as string
      expect(hasMissingCameraFields(image, ['camera.make'])).toBe(true)
    })

    it('returns true when camera.model is missing and checked', () => {
      const image = createMockImage('1')
      image.camera.model = undefined as unknown as string
      expect(hasMissingCameraFields(image, ['camera.model'])).toBe(true)
    })

    it('returns false when camera fields are present', () => {
      const image = createMockImage('1')
      image.camera.make = 'Canon'
      image.camera.model = 'EOS 5D'
      expect(hasMissingCameraFields(image, ['camera.make', 'camera.model'])).toBe(false)
    })

    it('returns true when at least one checked field is missing', () => {
      const image = createMockImage('1')
      image.camera.make = 'Canon'
      image.camera.model = undefined as unknown as string
      expect(hasMissingCameraFields(image, ['camera.make', 'camera.model'])).toBe(true)
    })

    it('returns true for empty string camera values', () => {
      const image = createMockImage('1')
      image.camera.make = ''
      image.camera.model = ''
      expect(hasMissingCameraFields(image, ['camera.make', 'camera.model'])).toBe(true)
    })
  })

  describe('applyTitleTemplate with missing camera fields', () => {
    it('renders empty string for undefined camera.make', () => {
      const image = createMockImage('1')
      image.camera.make = undefined as unknown as string
      const template = 'Photo {{camera.make}}.jpg'
      const result = applyTitleTemplate(template, image, 'seq123')
      expect(result).toBe('Photo .jpg')
    })

    it('renders empty string for undefined camera.model', () => {
      const image = createMockImage('1')
      image.camera.model = undefined as unknown as string
      const template = 'Photo {{camera.model}}.jpg'
      const result = applyTitleTemplate(template, image, 'seq123')
      expect(result).toBe('Photo .jpg')
    })

    it('renders empty string for both undefined camera fields', () => {
      const image = createMockImage('1')
      image.camera.make = undefined as unknown as string
      image.camera.model = undefined as unknown as string
      const template = 'Photo {{camera.make}} {{camera.model}}.jpg'
      const result = applyTitleTemplate(template, image, 'seq123')
      expect(result).toBe('Photo  .jpg')
    })
  })

  describe('CAMERA_FIELD_PATHS constant', () => {
    it('contains camera.make and camera.model', () => {
      expect(CAMERA_FIELD_PATHS).toEqual(['camera.make', 'camera.model'])
    })
  })

  describe('OPTIONAL_LOCATION_FIELD_PATHS constant', () => {
    it('contains all 7 optional location paths', () => {
      expect(OPTIONAL_LOCATION_FIELD_PATHS).toEqual([
        'location.compass_angle',
        'location.city',
        'location.country',
        'location.country_code',
        'location.county',
        'location.state',
        'location.postcode',
      ])
    })
  })

  describe('OPTIONAL_FIELD_PATHS constant', () => {
    it('is the union of CAMERA_FIELD_PATHS and OPTIONAL_LOCATION_FIELD_PATHS', () => {
      expect(OPTIONAL_FIELD_PATHS).toEqual([
        ...CAMERA_FIELD_PATHS,
        ...OPTIONAL_LOCATION_FIELD_PATHS,
      ])
    })
  })

  describe('extractUsedOptionalFields', () => {
    it('returns empty array for template with no optional fields', () => {
      expect(extractUsedOptionalFields('Photo by {{mapillary.user.username}}.jpg')).toEqual([])
    })

    it('returns location.city when used in template', () => {
      expect(extractUsedOptionalFields('Photo in {{location.city}}.jpg')).toEqual(['location.city'])
    })

    it('returns camera.make when used in template', () => {
      expect(extractUsedOptionalFields('Photo {{camera.make}}.jpg')).toEqual(['camera.make'])
    })

    it('returns mixed camera and location fields', () => {
      const result = extractUsedOptionalFields('{{camera.make}} in {{location.city}}.jpg')
      expect(result).toEqual(['camera.make', 'location.city'])
    })

    it('handles whitespace in template variables', () => {
      expect(extractUsedOptionalFields('Photo {{ location.city }}.jpg')).toEqual(['location.city'])
    })
  })

  describe('hasMissingOptionalFields', () => {
    it('returns false when usedFields is empty', () => {
      const image = createMockImage('1')
      expect(hasMissingOptionalFields(image, [])).toBe(false)
    })

    it('returns true when location.city is used and missing (null)', () => {
      const image = createMockImage('1')
      // city is undefined/null by default (not set in createMockImage)
      expect(hasMissingOptionalFields(image, ['location.city'])).toBe(true)
    })

    it('returns false when location.city is present', () => {
      const image = createMockImage('1')
      image.location = { ...image.location, city: 'Berlin' }
      expect(hasMissingOptionalFields(image, ['location.city'])).toBe(false)
    })

    it('returns false when compass_angle is 0 (valid value pointing North)', () => {
      const image = createMockImage('1')
      // compass_angle is 0 in createMockImage - should be treated as valid
      expect(hasMissingOptionalFields(image, ['location.compass_angle'])).toBe(false)
    })

    it('returns true when camera.make is missing', () => {
      const image = createMockImage('1')
      expect(hasMissingOptionalFields(image, ['camera.make'])).toBe(true)
    })

    it('returns false when all used fields are present', () => {
      const image = createMockImage('1')
      image.location = { ...image.location, city: 'Berlin', country: 'Germany' }
      image.camera = { make: 'Canon', model: 'EOS 5D', is_pano: false }
      expect(
        hasMissingOptionalFields(image, ['location.city', 'location.country', 'camera.make']),
      ).toBe(false)
    })

    it('returns true when at least one used field is missing', () => {
      const image = createMockImage('1')
      image.location = { ...image.location, city: 'Berlin' }
      // country is not set
      expect(hasMissingOptionalFields(image, ['location.city', 'location.country'])).toBe(true)
    })
  })
})
