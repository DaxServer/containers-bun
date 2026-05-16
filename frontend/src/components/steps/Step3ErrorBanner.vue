<script setup lang="ts">
const emit = defineEmits<{
  'toggle-filter': [active: boolean]
}>()

const store = useCollectionsStore()
const isFilterActive = ref(false)

const toggle = () => {
  isFilterActive.value = !isFilterActive.value
  emit('toggle-filter', isFilterActive.value)
}

watch(
  () => store.itemsWithErrorsCount,
  (count) => {
    if (count === 0) {
      isFilterActive.value = false
      emit('toggle-filter', false)
    }
  },
)
</script>

<template>
  <div
    v-if="store.itemsWithErrorsCount > 0"
    class="flex items-center justify-between px-4 py-2 bg-red-50 border border-red-300 rounded text-red-700"
  >
    <div class="flex items-center gap-2">
      <i class="pi pi-exclamation-circle" />
      <span>
        {{ store.itemsWithErrorsCount }}
        image{{ store.itemsWithErrorsCount > 1 ? 's have' : ' has' }} title errors
      </span>
    </div>
    <Button
      :label="isFilterActive ? 'Show all images' : 'Show errors only'"
      size="small"
      :severity="isFilterActive ? 'secondary' : 'danger'"
      outlined
      @click="toggle"
    />
  </div>
</template>
