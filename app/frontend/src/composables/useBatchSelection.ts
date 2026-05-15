import { useCollectionsStore } from '@/stores/collections.store'
import { computed, ref } from 'vue'

export const useBatchSelection = () => {
  const store = useCollectionsStore()
  const isSelectionMode = ref(false)
  const selectedIds = ref<Set<number>>(new Set())
  const selectedCount = computed(() => selectedIds.value.size)

  const startSelectionMode = () => {
    isSelectionMode.value = true
    selectedIds.value.clear()
  }

  const exitSelectionMode = () => {
    isSelectionMode.value = false
    selectedIds.value.clear()
  }

  const toggleSelection = (id: number) => {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
  }

  const isSelected = (id: number) => selectedIds.value.has(id)

  const selectAll = () => {
    for (const item of store.batchUploads) {
      selectedIds.value.add(item.id)
    }
  }

  const deselectAll = () => {
    selectedIds.value.clear()
  }

  return {
    isSelectionMode,
    selectedIds,
    selectedCount,
    startSelectionMode,
    exitSelectionMode,
    toggleSelection,
    isSelected,
    selectAll,
    deselectAll,
  }
}
