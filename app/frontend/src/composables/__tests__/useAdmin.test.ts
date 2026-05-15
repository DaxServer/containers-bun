import type { AdminUploadRequest } from '@frontend/types/admin'
import { UPLOAD_STATUS } from '@frontend/types/image'
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

const mockBatchesGet = mock(async () => ({ data: { items: [], total: 0 }, status: 200 }))
const mockUsersGet = mock(async () => ({ data: { items: [], total: 0 }, status: 200 }))
const mockPresetsGet = mock(async () => ({ data: { items: [], total: 0 }, status: 200 }))
const mockUploadRequestsGet = mock(async () => ({ data: { items: [], total: 0 }, status: 200 }))
const mockBulkCancel = mock(async () => ({ data: { cancelled_count: 2 }, status: 200 }))
const mockBulkFail = mock(async () => ({ data: { failed_count: 2 }, status: 200 }))
const mockUploadRequestPut = mock(async () => ({ status: 200 }))

const uploadRequestsEden = Object.assign(
  (_p: { id: number }) => ({ put: mockUploadRequestPut }),
  {
    get: mockUploadRequestsGet,
    'bulk-cancel': { post: mockBulkCancel },
    'bulk-fail': { post: mockBulkFail },
  },
)

mock.module('@frontend/lib/apiClient', () => ({
  api: {
    api: {
      admin: {
        batches: { get: mockBatchesGet },
        users: { get: mockUsersGet },
        presets: { get: mockPresetsGet },
        upload_requests: uploadRequestsEden,
      },
    },
  },
}))

const makeUploadRequest = (id: number, status: string): AdminUploadRequest => ({
  id,
  batchid: 1,
  userid: 'user1',
  status,
  key: `key${id}`,
  handler: 'mapillary',
  collection: null,
  filename: `file${id}.jpg`,
  wikitext: '',
  copyright_override: false,
  labels: null,
  result: null,
  error: undefined,
  success: null,
  celery_task_id: null,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
})

describe('useAdmin', () => {
  let useAdmin: typeof import('../useAdmin').useAdmin
  let useAdminStore: typeof import('../../stores/admin.store').useAdminStore

  beforeAll(async () => {
    const adminMod = await import('../useAdmin')
    const storeMod = await import('../../stores/admin.store')
    useAdmin = adminMod.useAdmin
    useAdminStore = storeMod.useAdminStore
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    mockBatchesGet.mockClear()
    mockUsersGet.mockClear()
    mockPresetsGet.mockClear()
    mockUploadRequestsGet.mockClear()
    mockBulkCancel.mockClear()
    mockBulkFail.mockClear()
    mockUploadRequestPut.mockClear()
  })

  describe('refreshAdminData - upload_requests filters', () => {
    it('includes status filter as repeated params in query', async () => {
      const store = useAdminStore()
      store.adminTable = 'upload_requests'
      store.adminStatusFilter = ['queued', 'failed']

      const { refreshAdminData } = useAdmin()
      await refreshAdminData()

      expect(mockUploadRequestsGet.mock.calls.length).toBe(1)
      const callArg = (mockUploadRequestsGet.mock.calls[0] as unknown as [{ query: Record<string, unknown> }])[0]
      expect(callArg.query.status).toEqual(['queued', 'failed'])
    })

    it('includes date_from and date_to when both dates are set', async () => {
      const store = useAdminStore()
      store.adminTable = 'upload_requests'
      store.adminDateRange = [
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-13T00:00:00.000Z'),
      ]

      const { refreshAdminData } = useAdmin()
      await refreshAdminData()

      expect(mockUploadRequestsGet.mock.calls.length).toBe(1)
      const callArg = (mockUploadRequestsGet.mock.calls[0] as unknown as [{ query: Record<string, unknown> }])[0]
      expect(callArg.query.date_from).toBe('2026-03-01')
      expect(callArg.query.date_to).toBe('2026-03-13')
    })

    it('omits date params when adminDateRange is null', async () => {
      const store = useAdminStore()
      store.adminTable = 'upload_requests'
      store.adminDateRange = null

      const { refreshAdminData } = useAdmin()
      await refreshAdminData()

      expect(mockUploadRequestsGet.mock.calls.length).toBe(1)
      const callArg = (mockUploadRequestsGet.mock.calls[0] as unknown as [{ query: Record<string, unknown> }])[0]
      expect(callArg.query.date_from).toBeUndefined()
      expect(callArg.query.date_to).toBeUndefined()
    })

    it('includes date_from but omits date_to when second date in range is null', async () => {
      const store = useAdminStore()
      store.adminTable = 'upload_requests'
      store.adminDateRange = [new Date('2026-03-01T00:00:00.000Z'), null]

      const { refreshAdminData } = useAdmin()
      await refreshAdminData()

      expect(mockUploadRequestsGet.mock.calls.length).toBe(1)
      const callArg = (mockUploadRequestsGet.mock.calls[0] as unknown as [{ query: Record<string, unknown> }])[0]
      expect(callArg.query.date_from).toBe('2026-03-01')
      expect(callArg.query.date_to).toBeUndefined()
    })
  })

  describe('clearText', () => {
    it('clears filterText and selection, leaves statusFilter and dateRange unchanged', () => {
      const store = useAdminStore()
      store.adminFilterText = 'foo'
      store.adminStatusFilter = ['queued']
      store.adminDateRange = [new Date(), null]
      store.selectedUploadRequests = [makeUploadRequest(1, 'queued')]

      const { clearText } = useAdmin()
      clearText()

      expect(store.adminFilterText).toBe('')
      expect(store.selectedUploadRequests).toEqual([])
      expect(store.adminStatusFilter).toEqual(['queued'])
      expect(store.adminDateRange).not.toBeNull()
    })
  })

  describe('clearAll', () => {
    it('resets all four store fields', () => {
      const store = useAdminStore()
      store.adminFilterText = 'foo'
      store.adminStatusFilter = ['queued']
      store.adminDateRange = [new Date(), null]
      store.selectedUploadRequests = [makeUploadRequest(1, 'queued')]

      const { clearAll } = useAdmin()
      clearAll()

      expect(store.adminFilterText).toBe('')
      expect(store.adminStatusFilter).toEqual([])
      expect(store.adminDateRange).toBeNull()
      expect(store.selectedUploadRequests).toEqual([])
    })
  })

  describe('cancelSelected', () => {
    it('posts only queued and in_progress IDs to bulk-cancel endpoint', async () => {
      const store = useAdminStore()
      store.selectedUploadRequests = [
        makeUploadRequest(1, 'queued'),
        makeUploadRequest(2, 'completed'),
        makeUploadRequest(3, 'in_progress'),
        makeUploadRequest(4, 'failed'),
      ]

      mockBulkCancel.mockImplementation(async () => ({ data: { cancelled_count: 2 }, status: 200 }))

      const { cancelSelected } = useAdmin()
      const result = await cancelSelected()

      expect(result).toEqual({ cancelled_count: 2 })
      expect(mockBulkCancel.mock.calls.length).toBe(1)
      const callArg = (mockBulkCancel.mock.calls[0] as unknown as [{ ids: number[] }])[0]
      expect(callArg.ids).toEqual([1, 3])
    })

    it('throws on non-ok response', async () => {
      const store = useAdminStore()
      store.selectedUploadRequests = [makeUploadRequest(1, 'queued')]

      mockBulkCancel.mockImplementation(async () => ({ data: null, status: 500 }) as unknown as { data: { cancelled_count: number }; status: number })

      const { cancelSelected } = useAdmin()
      let threw = false
      try {
        await cancelSelected()
      } catch (e) {
        threw = true
        expect((e as Error).message).toBe('Failed to cancel upload requests')
      }
      expect(threw).toBe(true)
    })
  })

  describe('markSelectedAsFailed', () => {
    it('calls bulk-fail endpoint with filtered IDs', async () => {
      const store = useAdminStore()
      store.adminUploadRequests = [
        makeUploadRequest(1, UPLOAD_STATUS.Queued),
        makeUploadRequest(2, UPLOAD_STATUS.Failed),
        makeUploadRequest(3, UPLOAD_STATUS.InProgress),
      ]
      store.selectedUploadRequests = [
        store.adminUploadRequests[0]!,
        store.adminUploadRequests[1]!,
        store.adminUploadRequests[2]!,
      ]

      mockBulkFail.mockImplementation(async () => ({ data: { failed_count: 2 }, status: 200 }))

      const { markSelectedAsFailed } = useAdmin()
      const result = await markSelectedAsFailed()

      expect(result).toEqual({ failed_count: 2 })
      expect(mockBulkFail.mock.calls.length).toBe(1)
      const callArg = (mockBulkFail.mock.calls[0] as unknown as [{ ids: number[] }])[0]
      expect(callArg.ids).toEqual([1, 3]) // Only non-failed
    })

    it('throws when API call fails', async () => {
      const store = useAdminStore()
      store.selectedUploadRequests = [makeUploadRequest(1, UPLOAD_STATUS.Queued)]

      mockBulkFail.mockImplementation(async () => ({ data: null, status: 500 }) as unknown as { data: { failed_count: number }; status: number })

      const { markSelectedAsFailed } = useAdmin()
      let threw = false
      try {
        await markSelectedAsFailed()
      } catch (e) {
        threw = true
        expect((e as Error).message).toBe('Failed to mark upload requests as failed')
      }
      expect(threw).toBe(true)
    })
  })
})
