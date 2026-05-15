import type { PresetItem } from '@/types/asyncapi'
import type { Item } from '@/types/image'

export const makeItem = (
  index: number,
  selected = false,
  takenAt?: Date,
  latitude = 0,
  longitude = 0,
): Item => ({
  id: `item-${index}`,
  index,
  isSkeleton: false,
  image: {
    id: `img-${index}`,
    location: { latitude, longitude, compass_angle: null },
    thumb_url: '',
    full_url: '',
    existing: [],
    captured_at: '',
    sequence_id: '',
    dates: { taken: takenAt ?? new Date(0) },
  } as unknown as Item['image'],
  meta: {
    selected,
    description: { language: 'en', value: '' },
    categories: '',
  },
})

export const makePreset = (overrides: Partial<PresetItem> = {}): PresetItem => ({
  id: 1,
  title: 'Test Preset',
  title_template: 'Test {{mapillary.user.username}}.jpg',
  labels: { language: 'en', value: 'Test description' },
  categories: 'Test category',
  exclude_from_date_category: false,
  handler: 'mapillary',
  is_default: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
})
