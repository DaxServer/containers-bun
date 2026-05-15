import type { AdminUploadRequest } from '@/types/admin'
import { UPLOAD_STATUS } from '@/types/image'
import { beforeEach, describe, expect, it } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { useAdminStore } from '../admin.store'

describe('failableCount', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  it('counts selected items that are not failed', () => {
    const store = useAdminStore()
    store.adminUploadRequests = [
      { id: 1, status: UPLOAD_STATUS.Queued },
      { id: 2, status: UPLOAD_STATUS.Failed },
      { id: 3, status: UPLOAD_STATUS.InProgress },
      { id: 4, status: UPLOAD_STATUS.Completed },
    ] as AdminUploadRequest[]

    store.selectedUploadRequests = [
      store.adminUploadRequests[0]!,
      store.adminUploadRequests[1]!,
      store.adminUploadRequests[2]!,
    ]

    expect(store.failableCount).toBe(2) // Queued and InProgress, not Failed
  })

  it('returns 0 when no items selected', () => {
    const store = useAdminStore()
    store.selectedUploadRequests = []
    expect(store.failableCount).toBe(0)
  })

  it('returns 0 when all selected are failed', () => {
    const store = useAdminStore()
    store.adminUploadRequests = [
      { id: 1, status: UPLOAD_STATUS.Failed },
      { id: 2, status: UPLOAD_STATUS.Failed },
    ] as AdminUploadRequest[]

    store.selectedUploadRequests = store.adminUploadRequests
    expect(store.failableCount).toBe(0)
  })
})
