import type { ColorVariant } from '@frontend/composables/useUploadStatus'
import type { UploadStatus } from '@frontend/types/image'

export const ImageHandler = { MAPILLARY: 'mapillary' } as const
export type Handler = (typeof ImageHandler)[keyof typeof ImageHandler]
export type Layout = 'list' | 'grid'
export const INTERVAL_UNITS = ['milliseconds', 'seconds', 'minutes'] as const
export type IntervalUnit = (typeof INTERVAL_UNITS)[number]
export const DISTANCE_UNITS = ['meters', 'kilometers'] as const
export type DistanceUnit = (typeof DISTANCE_UNITS)[number]

export type BatchStatsCard = {
  label: string
  count: number
  color: ColorVariant
  value: 'all' | UploadStatus
  alwaysActive?: boolean
}
