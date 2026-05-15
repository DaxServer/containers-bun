import { UPLOAD_STATUS, type UploadStatus } from '@/types/image'

export const COLOR_VARIANTS = {
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    labelColor: 'text-gray-600',
    labelColorInactive: 'text-gray-300',
    countColor: 'text-gray-900',
    countColorInactive: 'text-gray-200',
    ring: 'ring-gray-500',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    labelColor: 'text-green-600',
    labelColorInactive: 'text-green-300',
    countColor: 'text-green-700',
    countColorInactive: 'text-green-200',
    ring: 'ring-green-500',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    labelColor: 'text-red-600',
    labelColorInactive: 'text-red-300',
    countColor: 'text-red-700',
    countColorInactive: 'text-red-200',
    ring: 'ring-red-500',
  },
  fuchsia: {
    bg: 'bg-fuchsia-50',
    border: 'border-fuchsia-200',
    labelColor: 'text-fuchsia-600',
    labelColorInactive: 'text-fuchsia-300',
    countColor: 'text-fuchsia-700',
    countColorInactive: 'text-fuchsia-200',
    ring: 'ring-fuchsia-500',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    labelColor: 'text-blue-600',
    labelColorInactive: 'text-blue-300',
    countColor: 'text-blue-700',
    countColorInactive: 'text-blue-200',
    ring: 'ring-blue-500',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    labelColor: 'text-orange-600',
    labelColorInactive: 'text-orange-300',
    countColor: 'text-orange-700',
    countColorInactive: 'text-orange-200',
    ring: 'ring-orange-500',
  },
} as const

export type ColorVariant = keyof typeof COLOR_VARIANTS

const DUPLICATE_STATUSES: ReadonlySet<UploadStatus> = new Set([
  UPLOAD_STATUS.Duplicate,
  UPLOAD_STATUS.DuplicatedSdcUpdated,
  UPLOAD_STATUS.DuplicatedSdcNotUpdated,
] as const)

const STATUS_LABELS: Record<UploadStatus, string> = {
  [UPLOAD_STATUS.Queued]: 'Queued',
  [UPLOAD_STATUS.InProgress]: 'Processing',
  [UPLOAD_STATUS.Completed]: 'Completed',
  [UPLOAD_STATUS.Failed]: 'Failed',
  [UPLOAD_STATUS.Duplicate]: 'Duplicate (no changes)',
  [UPLOAD_STATUS.DuplicatedSdcUpdated]: 'Duplicate (SDC updated)',
  [UPLOAD_STATUS.DuplicatedSdcNotUpdated]: 'Duplicate (no changes to SDC)',
  [UPLOAD_STATUS.Cancelled]: 'Cancelled',
} as const

export const useUploadStatus = () => {
  const isDuplicateStatus = (status: UploadStatus): boolean => DUPLICATE_STATUSES.has(status)
  const getStatusLabel = (status: UploadStatus): string => STATUS_LABELS[status]

  const getStatusColor = (status: UploadStatus | 'all'): ColorVariant => {
    if (status === 'all') return 'gray'
    if (status === UPLOAD_STATUS.Completed) return 'green'
    if (status === UPLOAD_STATUS.Failed) return 'red'
    if (status === UPLOAD_STATUS.Cancelled) return 'orange'
    if (isDuplicateStatus(status)) return 'fuchsia'
    if (status === UPLOAD_STATUS.InProgress) return 'blue'
    return 'gray'
  }

  const getStatusSeverity = (status: UploadStatus) => {
    if (status === UPLOAD_STATUS.InProgress) return 'info'
    if (status === UPLOAD_STATUS.Queued) return 'secondary'
    if (status === UPLOAD_STATUS.Failed) return 'danger'
    if (status === UPLOAD_STATUS.Cancelled) return 'warn'
    if (isDuplicateStatus(status)) return 'contrast'
    if (status === UPLOAD_STATUS.Completed) return 'success'
    return 'secondary'
  }

  const getStatusStyle = (status: UploadStatus) => {
    if (isDuplicateStatus(status)) {
      return { backgroundColor: 'var(--p-fuchsia-50)', color: 'var(--p-fuchsia-800)' }
    }
    return {}
  }

  return {
    isDuplicateStatus,
    getStatusLabel,
    getStatusColor,
    getStatusSeverity,
    getStatusStyle,
  }
}
