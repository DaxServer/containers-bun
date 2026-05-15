import type { MediaImage, StructuredError } from '@/types/asyncapi'

export interface Image extends Omit<MediaImage, 'dates' | 'description'> {
  dates: {
    taken: Date
  }
  description: string
}

export interface Metadata {
  title?: string
  description: Label
  categories: string
  license?: string
  selected: boolean
  status?: UploadStatus
  statusReason?: string
  titleStatus?: TitleStatus
  /** Field paths from OPTIONAL_FIELD_PATHS that are missing on this item (set when titleStatus is MissingFields) */
  missingFields?: string[]
  successUrl?: string
  errorInfo?: StructuredError
}
export type MetadataKey = keyof Metadata
export type MetadataValue = Metadata[MetadataKey]

export type Item = {
  image: Image
  meta: Metadata
  /** 1-based position in the sequence */
  index: number
  id: string
  isSkeleton: boolean
}

export const TITLE_STATUS = {
  Checking: 'checking',
  Available: 'available',
  Taken: 'taken',
  Unknown: 'unknown',
  Invalid: 'invalid',
  Blacklisted: 'blacklisted',
  Duplicate: 'duplicate',
  MissingFields: 'missing_fields',
} as const

export type TitleStatus = (typeof TITLE_STATUS)[keyof typeof TITLE_STATUS]

export const TITLE_ERROR_STATUSES: readonly TitleStatus[] = [
  TITLE_STATUS.Taken,
  TITLE_STATUS.Invalid,
  TITLE_STATUS.Blacklisted,
  TITLE_STATUS.Duplicate,
  TITLE_STATUS.MissingFields,
] as const

export const TITLE_ERROR_LABELS: Record<string, string> = {
  [TITLE_STATUS.Taken]: 'Title already exists on Wikimedia Commons',
  [TITLE_STATUS.Invalid]: 'Title contains invalid characters',
  [TITLE_STATUS.Blacklisted]: 'Title is blacklisted',
  [TITLE_STATUS.Duplicate]: 'Duplicate title in this batch',
  [TITLE_STATUS.MissingFields]: 'Title template uses fields missing from this image',
}

export const UPLOAD_STATUS = {
  Queued: 'queued',
  InProgress: 'in_progress',
  Completed: 'completed',
  Failed: 'failed',
  Duplicate: 'duplicate',
  DuplicatedSdcUpdated: 'duplicated_sdc_updated',
  DuplicatedSdcNotUpdated: 'duplicated_sdc_not_updated',
  Cancelled: 'cancelled',
} as const

export type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS]

export type UploadStatusUpdate =
  | {
      key: string
      status: typeof UPLOAD_STATUS.Queued | typeof UPLOAD_STATUS.InProgress
      error?: never
      success?: never
    }
  | {
      key: string
      status:
        | typeof UPLOAD_STATUS.Failed
        | typeof UPLOAD_STATUS.Duplicate
        | typeof UPLOAD_STATUS.DuplicatedSdcUpdated
        | typeof UPLOAD_STATUS.DuplicatedSdcNotUpdated
      error: StructuredError
      success?: never
    }
  | {
      key: string
      status: typeof UPLOAD_STATUS.Completed
      success: string
      error?: never
    }
