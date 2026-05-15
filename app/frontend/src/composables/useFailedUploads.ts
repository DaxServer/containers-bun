import { useFailedUploadsStore } from '@/stores/failedUploads.store'
import type { FailedUploadsResponse } from '@/types/admin'
import { watch } from 'vue'

export const useFailedUploads = () => {
  const store = useFailedUploadsStore()
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const fetchFailedUploads = async (): Promise<void> => {
    const page = Math.floor(store.params.first / store.params.rows) + 1

    store.loading = true

    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(store.params.rows),
        sort_by: store.sortBy,
      })

      if (store.errorTypeFilter !== null) {
        queryParams.set('error_type', store.errorTypeFilter)
      }
      if (store.handlerFilter !== null) {
        queryParams.set('handler', store.handlerFilter)
      }
      if (store.searchText) {
        queryParams.set('search_text', store.searchText)
      }

      const response = await fetch(`/api/admin/failed_uploads?${queryParams}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch failed uploads: ${response.status} ${response.statusText}`)
      }

      const data: FailedUploadsResponse = await response.json()
      store.batches = data.items
      store.total = data.total
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
