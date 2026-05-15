<script setup lang="ts">
const store = useFailedUploadsStore()
const { fetchFailedUploads } = useFailedUploads()

const sortOptions = ['recent', 'batchSize', 'errorType', 'user'] as const
const hasActiveFilters = computed(
  () => store.errorTypeFilter || store.handlerFilter || store.searchText,
)

const onPage = (event: { first: number; rows: number; page: number }) => {
  store.params = {
    first: event.first,
    rows: event.rows,
    page: event.page + 1,
  }
  fetchFailedUploads()
}

const onSortChange = () => {
  store.params.first = 0
  store.params.page = 1
  fetchFailedUploads()
}

const onFilterChange = () => {
  store.params.first = 0
  store.params.page = 1
  fetchFailedUploads()
}

const clearFiltersAndRefetch = () => {
  store.resetFilters()
  fetchFailedUploads()
}

onMounted(() => {
  fetchFailedUploads()
})
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">Failed Uploads</h1>
      <div class="flex gap-2 items-center">
        <Tag severity="danger">{{ store.totalFailures }} total</Tag>
        <Tag>{{ store.totalBatches }} batches</Tag>
        <Button
          label="Refresh"
          @click="fetchFailedUploads"
        />
      </div>
    </div>

    <!-- Sort and Filter Controls -->
    <div class="flex justify-between items-center bg-gray-50 mb-4 rounded-lg">
      <div class="flex gap-2 items-center">
        <span class="text-sm text-gray-600">Sort by:</span>
        <Button
          v-for="option in sortOptions"
          :key="option"
          :label="option"
          :severity="store.sortBy === option ? 'primary' : 'secondary'"
          :outlined="store.sortBy !== option"
          size="small"
          @click="
            () => {
              store.sortBy = option
              onSortChange()
            }
          "
        />
      </div>

      <div class="flex gap-2">
        <Select
          v-model="store.errorTypeFilter"
          :options="[
            { label: 'All errors', value: null },
            { label: 'Rate limit', value: 'rate_limit' },
            { label: 'Duplicate', value: 'duplicate' },
            { label: 'Timeout', value: 'timeout' },
            { label: 'Auth', value: 'auth' },
            { label: 'Network', value: 'network' },
          ]"
          option-label="label"
          option-value="value"
          placeholder="All errors"
          class="w-48"
          @change="onFilterChange"
        />

        <Select
          v-model="store.handlerFilter"
          :options="[
            { label: 'All handlers', value: null },
            { label: 'Mapillary', value: 'mapillary' },
          ]"
          option-label="label"
          option-value="value"
          placeholder="All handlers"
          class="w-40"
          @change="onFilterChange"
        />

        <InputText
          v-model="store.searchText"
          placeholder="Search user, batch, filename..."
          class="w-64"
        />

        <Button
          v-if="hasActiveFilters"
          label="Clear filters"
          severity="secondary"
          outlined
          size="small"
          @click="clearFiltersAndRefetch"
        />
      </div>
    </div>

    <!-- Batch Groups -->
    <div
      v-if="store.loading"
      class="flex justify-center items-center min-h-[200px]"
    >
      <ProgressSpinner />
    </div>

    <div
      v-else-if="store.batches.length === 0"
      class="flex justify-center items-center min-h-[200px]"
    >
      <p class="text-gray-600">No failed uploads found</p>
      <Button
        v-if="hasActiveFilters"
        label="Clear all filters"
        severity="secondary"
        class="ml-4"
        @click="clearFiltersAndRefetch"
      />
    </div>

    <div v-else>
      <BatchFailureGroup
        v-for="group in store.batches"
        :key="group.batch.id"
        :group="group"
      />

      <Paginator
        :rows="store.params.rows"
        :total-records="store.total"
        :first="store.params.first"
        @page="onPage"
      />
    </div>
  </div>
</template>
