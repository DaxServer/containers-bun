import { useAdminStore } from '@/stores/admin.store'
import type {
  AdminBatch,
  AdminPreset,
  AdminUploadRequest,
  AdminUser,
  PaginatedResponse,
} from '@/types/admin'
import { UPLOAD_STATUS } from '@/types/image'

const fetchData = async <T>(
  endpoint: string,
  page: number,
  limit: number,
  filterText?: string,
  extraParams?: Record<string, string | string[]>,
): Promise<PaginatedResponse<T>> => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (filterText) params.set('filter_text', filterText)
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          params.append(key, v)
        }
      } else {
        params.set(key, value)
      }
    }
  }
  const response = await fetch(`/api/admin/${endpoint}?${params}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`)
  }
  return response.json()
}

export const useAdmin = () => {
  const store = useAdminStore()

  const updateAdminUploadRequest = async (
    id: number,
    field: string,
    value: string,
  ): Promise<void> => {
    const response = await fetch(`/api/admin/upload_requests/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ [field]: value }),
    })
    if (!response.ok) {
      throw new Error('Failed to update upload request')
    }
  }

  const refreshAdminData = async () => {
    const { adminTable, adminParams, adminFilterText } = store
    const page = Math.floor(adminParams.first / adminParams.rows) + 1
    const filterText = adminFilterText || undefined

    store.adminLoading = true

    try {
      switch (adminTable) {
        case 'batches': {
          const data = await fetchData<AdminBatch>('batches', page, adminParams.rows, filterText)
          store.adminBatches = data.items
          store.adminTotal = data.total
          break
        }
        case 'users': {
          const data = await fetchData<AdminUser>('users', page, adminParams.rows, filterText)
          store.adminUsers = data.items
          store.adminTotal = data.total
          break
        }
        case 'upload_requests': {
          const extraParams: Record<string, string | string[]> = {}
          if (store.adminStatusFilter.length > 0) {
            extraParams.status = store.adminStatusFilter
          }
          if (store.adminDateRange?.[0]) {
            // Use ISO format (UTC) to match backend timestamps - all dates are stored in UTC
            extraParams.date_from = store.adminDateRange[0].toISOString().split('T')[0]!
            if (store.adminDateRange[1]) {
              extraParams.date_to = store.adminDateRange[1].toISOString().split('T')[0]!
            }
          }
          const data = await fetchData<AdminUploadRequest>(
            'upload_requests',
            page,
            adminParams.rows,
            filterText,
            extraParams,
          )
          store.adminUploadRequests = data.items
          store.adminTotal = data.total
          break
        }
        case 'presets': {
          const data = await fetchData<AdminPreset>('presets', page, adminParams.rows, filterText)
          store.adminPresets = data.items
          store.adminTotal = data.total
          break
        }
      }
    } finally {
      store.adminLoading = false
    }
  }

  const cancelSelected = async (): Promise<{ cancelled_count: number }> => {
    const ids = store.selectedUploadRequests
      .filter((r) => r.status === UPLOAD_STATUS.Queued || r.status === UPLOAD_STATUS.InProgress)
      .map((r) => r.id)
    const response = await fetch('/api/admin/upload_requests/bulk-cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (!response.ok) {
      throw new Error('Failed to cancel upload requests')
    }
    return response.json()
  }

  const markSelectedAsFailed = async (): Promise<{ failed_count: number }> => {
    const ids = store.selectedUploadRequests
      .filter((r) => r.status !== UPLOAD_STATUS.Failed)
      .map((r) => r.id)
    const response = await fetch('/api/admin/upload_requests/bulk-fail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (!response.ok) {
      throw new Error('Failed to mark upload requests as failed')
    }
    return response.json()
  }

  const clearText = () => {
    store.adminFilterText = ''
    store.selectedUploadRequests = []
  }

  const clearAll = () => {
    store.adminFilterText = ''
    store.adminStatusFilter = []
    store.adminDateRange = null
    store.selectedUploadRequests = []
  }

  return {
    updateAdminUploadRequest,
    refreshAdminData,
    cancelSelected,
    markSelectedAsFailed,
    clearText,
    clearAll,
  }
}
