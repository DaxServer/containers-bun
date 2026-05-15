import type { BatchFailureGroup } from '@/types/admin'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'

export const useFailedUploadsStore = defineStore('failedUploads', () => {
  // Data
  const batches = shallowRef<BatchFailureGroup[]>([])
  const total = ref(0)
  const totalFailures = computed(() =>
    batches.value.reduce((sum, b) => sum + b.batch.failedCount, 0),
  )
  const totalBatches = computed(() => batches.value.length)

  // Pagination
  const params = ref({
    first: 0,
    rows: 50,
    page: 1,
  })

  // Filters
  const sortBy = ref<'recent' | 'batchSize' | 'errorType' | 'user'>('recent')
  const errorTypeFilter = ref<string | null>(null)
  const handlerFilter = ref<string | null>(null)
  const searchText = ref('')

  // UI state
  const loading = ref(false)

  // Actions
  const resetFilters = () => {
    sortBy.value = 'recent'
    errorTypeFilter.value = null
    handlerFilter.value = null
    searchText.value = ''
    params.value.first = 0
    params.value.page = 1
  }

  return {
    batches,
    total,
    totalFailures,
    totalBatches,
    params,
    sortBy,
    errorTypeFilter,
    handlerFilter,
    searchText,
    loading,
    resetFilters,
  }
})
