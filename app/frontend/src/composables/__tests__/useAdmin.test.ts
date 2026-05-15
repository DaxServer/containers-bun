import type { AdminUploadRequest } from '@/types/admin'
import { UPLOAD_STATUS } from '@/types/image'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { useAdminStore } from '../../stores/admin.store'
import { useAdmin } from '../useAdmin'

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
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('refreshAdminData - upload_requests filters', () => {
    it('includes status filter as repeated params in URL', async () => {
      const store = useAdminStore()
      store.adminTable = 'upload_requests'
      store.adminStatusFilter = ['queued', 'failed']

      let capturedUrl = ''
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [], total: 0 }),
        }),
      )
      global.fetch = mockFetch as unknown as typeof fetch

      const { refreshAdminData } = useAdmin()
      await refreshAdminData()

      capturedUrl = (mockFetch.mock.calls[0] as unknown as [string])[0]
      expect(capturedUrl).toContain('status=queued')
      expect(capturedUrl).toContain('status=failed')
    })

    it('includes date_from and date_to when both dates are set', async () => {
      const store = useAdminStore()
      store.adminTable = 'upload_requests'
      store.adminDateRange = [
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-13T00:00:00.000Z'),
      ]

      let capturedUrl = ''
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [], total: 0 }),
        }),
      )
      global.fetch = mockFetch as unknown as typeof fetch

      const { refreshAdminData } = useAdmin()
      await refreshAdminData()

      capturedUrl = (mockFetch.mock.calls[0] as unknown as [string])[0]
      expect(capturedUrl).toContain('date_from=2026-03-01')
      expect(capturedUrl).toContain('date_to=2026-03-13')
    })

    it('omits date params when adminDateRange is null', async () => {
      const store = useAdminStore()
      store.adminTable = 'upload_requests'
      store.adminDateRange = null

      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [], total: 0 }),
        }),
      )
      global.fetch = mockFetch as unknown as typeof fetch

      const { refreshAdminData } = useAdmin()
      await refreshAdminData()

      const capturedUrl = (mockFetch.mock.calls[0] as unknown as [string])[0]
      expect(capturedUrl).not.toContain('date_from')
      expect(capturedUrl).not.toContain('date_to')
    })

    it('includes date_from but omits date_to when second date in range is null', async () => {
      const store = useAdminStore()
      store.adminTable = 'upload_requests'
      store.adminDateRange = [new Date('2026-03-01T00:00:00.000Z'), null]

      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [], total: 0 }),
        }),
      )
      global.fetch = mockFetch as unknown as typeof fetch

      const { refreshAdminData } = useAdmin()
      await refreshAdminData()

      const capturedUrl = (mockFetch.mock.calls[0] as unknown as [string])[0]
      expect(capturedUrl).toContain('date_from=2026-03-01')
      expect(capturedUrl).not.toContain('date_to')
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

      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ cancelled_count: 2 }),
        }),
      )
      global.fetch = mockFetch as unknown as typeof fetch

      const { cancelSelected } = useAdmin()
      const result = await cancelSelected()

      expect(result).toEqual({ cancelled_count: 2 })
      const call = mockFetch.mock.calls[0] as unknown as [string, RequestInit]
      expect(call[0]).toBe('/api/admin/upload_requests/bulk-cancel')
      expect(call[1].method).toBe('POST')
      const body = JSON.parse(call[1].body as string) as { ids: number[] }
      expect(body.ids).toEqual([1, 3])
    })

    it('throws on non-ok response', async () => {
      const store = useAdminStore()
      store.selectedUploadRequests = [makeUploadRequest(1, 'queued')]

      const mockFetch = mock(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({}),
        }),
      )
      global.fetch = mockFetch as unknown as typeof fetch

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

      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ failed_count: 2 }),
        }),
      )
      global.fetch = mockFetch as unknown as typeof fetch

      const { markSelectedAsFailed } = useAdmin()
      const result = await markSelectedAsFailed()

      expect(result).toEqual({ failed_count: 2 })
      const call = mockFetch.mock.calls[0] as unknown as [string, RequestInit]
      expect(call[0]).toBe('/api/admin/upload_requests/bulk-fail')
      expect(call[1].method).toBe('POST')
      const body = JSON.parse(call[1].body as string) as { ids: number[] }
      expect(body.ids).toEqual([1, 3]) // Only non-failed
    })

    it('throws when API call fails', async () => {
      const store = useAdminStore()
      store.selectedUploadRequests = [makeUploadRequest(1, UPLOAD_STATUS.Queued)]

      const mockFetch = mock(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({}),
        }),
      )
      global.fetch = mockFetch as unknown as typeof fetch

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
