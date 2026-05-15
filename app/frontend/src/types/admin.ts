// Types matching backend admin endpoints

import type {
  BatchItem,
  Label,
  PresetItem,
  StructuredError,
  UploadUpdateItem,
} from '@/types/asyncapi'

export type AdminUser = {
  userid: string
  username: string
  created_at: string
  updated_at: string
}

export type AdminBatch = Omit<BatchItem, 'username' | 'stats'>

export type AdminUploadRequest = {
  id: number
  batchid: number
  userid: string
  status: string
  key: string
  handler: string
  collection: string | null
  filename: string
  wikitext: string
  copyright_override: boolean
  sdc?: unknown[]
  labels: Label | null
  result: string | null
  error: UploadUpdateItem['error']
  success: string | null
  celery_task_id: string | null
  created_at: string
  updated_at: string
}

export type AdminPreset = PresetItem & { userid: string }

export type FailedUpload = {
  id: number
  filename: string
  handler: string
  status: string
  error: StructuredError | null
  createdAt: string
  errorType: string
}

export type BatchFailureGroup = {
  batch: {
    id: number
    editGroupId: string | null
    totalUploads: number
    failedCount: number
    createdAt: string
    handler: string
  }
  user: {
    username: string
    userid: string
  }
  failedUploads: FailedUpload[]
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
}

export type FailedUploadsResponse = PaginatedResponse<BatchFailureGroup>
