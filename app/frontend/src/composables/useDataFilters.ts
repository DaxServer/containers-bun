import { useUploadStatus } from '@/composables/useUploadStatus'
import { useCollectionsStore } from '@/stores/collections.store'
import { UPLOAD_STATUS, type UploadStatus } from '@/types/image'
import { computed, ref } from 'vue'

export const useDataFilters = () => {
  const store = useCollectionsStore()
  const { isDuplicateStatus } = useUploadStatus()

  const searchText = ref('')
  const filterValue = ref<string | UploadStatus>('all')

  const filteredItems = computed(() => {
    let uploads = store.batchUploads

    // Apply filter by status
    if (filterValue.value !== 'all') {
      uploads = uploads.filter((upload) => {
        if (filterValue.value === UPLOAD_STATUS.Duplicate) {
          return isDuplicateStatus(upload.status as UploadStatus)
        }
        return upload.status === filterValue.value
      })
    }

    // Apply search text
    if (searchText.value) {
      const lower = searchText.value.toLowerCase()
      uploads = uploads.filter(
        (u) =>
          u.filename?.toLowerCase().includes(lower) ||
          u.key?.toLowerCase().includes(lower) ||
          String(u.id).includes(lower) ||
          u.wikitext?.toLowerCase().includes(lower) ||
          u.status.toLowerCase().includes(lower) ||
          u.error?.message.toLowerCase().includes(lower),
      )
    }

    return uploads
  })

  const filteredCount = computed(() => filteredItems.value.length)
  const totalCount = computed(() => store.batchUploads.length)

  const clearFilters = () => {
    searchText.value = ''
    filterValue.value = 'all'
  }

  return {
    searchText,
    filterValue,
    filteredItems,
    filteredCount,
    totalCount,
    clearFilters,
  }
}
