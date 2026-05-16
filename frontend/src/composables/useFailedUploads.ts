import { api } from '@frontend/lib/apiClient'
import { useFailedUploadsStore } from '@frontend/stores/failedUploads.store'
import type { BatchFailureGroup, FailedUploadsResponse } from '@frontend/types/admin'
import { watch } from 'vue'

export const useFailedUploads = () => {
  const store = useFailedUploadsStore()
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const fetchFailedUploads = async (): Promise<void> => {
    const page = Math.floor(store.params.first / store.params.rows) + 1

    store.loading = true

    try {
      const { data, status } = await api.api.admin.failed_uploads.get({
        query: {
          page,
          limit: store.params.rows,
          sort_by: store.sortBy,
          error_type: store.errorTypeFilter ?? undefined,
          handler: store.handlerFilter ?? undefined,
          search_text: store.searchText || undefined,
        },
      })
      if (status !== 200 || !data) throw new Error(`Failed to fetch failed uploads: ${status}`)
      const result = data as unknown as FailedUploadsResponse
      store.batches = result.items as BatchFailureGroup[]
      store.total = result.total
    } finally {
      store.loading = false
    }
  }

  watch(
    () => store.searchText,
    () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        store.params.first = 0
        store.params.page = 1
        fetchFailedUploads()
      }, 500)
    },
  )

  return { fetchFailedUploads }
}
