<script lang="ts" setup>
defineProps<{
  page: number
  itemsPerPage: number
  totalItems: number
  perPageOptions: number[]
}>()

defineEmits<{
  'update:page': [number]
  'update:itemsPerPage': [number]
}>()
</script>

<template>
  <div class="flex items-center justify-between mt-4">
    <Select
      :model-value="itemsPerPage"
      :options="perPageOptions"
      @update:model-value="$emit('update:itemsPerPage', $event)"
      placeholder="Items per page"
      class="w-48"
    />
    <Paginator
      :first="(page - 1) * itemsPerPage"
      :rows="itemsPerPage"
      :total-records="totalItems"
      @page="$emit('update:page', $event.page + 1)"
      template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
    />
  </div>
</template>
