<script setup lang="ts">
const props = defineProps<{
  filterText: string
  filterInfo?: string
  searchPlaceholder: string
  searchId: string
  loading?: boolean
  showUploadFilters?: boolean
  statusFilter?: string[]
  dateRange?: [Date, Date | null] | null
}>()

const emit = defineEmits<{
  'update:filterText': [value: string]
  'update:statusFilter': [value: string[]]
  'update:dateRange': [value: Date | Array<Date> | Array<Date | null> | undefined | null]
  clearText: []
  clearAll: []
  search: []
  statusChange: []
  dateChange: []
}>()

const { getStatusLabel, getStatusSeverity, getStatusStyle } = useUploadStatus()

const statusOptions = Object.values(UPLOAD_STATUS).map((value) => ({
  value,
  label: getStatusLabel(value),
}))

const hasActiveFilters = computed(
  () =>
    props.filterText ||
    (props.statusFilter && props.statusFilter.length > 0) ||
    props.dateRange != null,
)

const formatDate = (d: Date) =>
  d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

const updateDateFileter = (
  dateRange: Date | Array<Date> | Array<Date | null> | undefined | null,
) => {
  emit('update:dateRange', dateRange)
  emit('dateChange')
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-3">
      <template v-if="showUploadFilters">
        <MultiSelect
          :model-value="statusFilter"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          placeholder="Filter by status"
          class="max-w-xs"
          :show-toggle-all="false"
          fluid
          @update:model-value="$emit('update:statusFilter', $event)"
          @change="$emit('statusChange')"
        />
        <DatePicker
          :model-value="dateRange"
          selection-mode="range"
          placeholder="Filter by date range"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-clear
          class="max-w-xs"
          @update:model-value="updateDateFileter"
        />
      </template>
      <SearchInput
        :model-value="filterText"
        :placeholder="searchPlaceholder"
        :id="searchId"
        :loading="loading"
        @update:model-value="$emit('update:filterText', $event)"
        @clear="$emit('clearText')"
        @enter="$emit('search')"
      />
    </div>
    <div
      v-if="hasActiveFilters"
      class="flex flex-wrap items-center gap-1.5 text-sm text-gray-600"
    >
      <span
        v-if="filterInfo"
        class="text-gray-500"
      >
        {{ filterInfo }}
      </span>
      <template v-if="filterText">
        <span>Filtering by:</span>
        <span class="font-semibold">"{{ filterText }}"</span>
      </template>
      <template v-if="statusFilter && statusFilter.length > 0">
        <Tag
          v-for="s in statusFilter"
          :key="s"
          :severity="getStatusSeverity(s as UploadStatus)"
          :style="getStatusStyle(s as UploadStatus)"
          :value="getStatusLabel(s as UploadStatus)"
        />
      </template>
      <template v-if="dateRange?.[0]">
        <Tag
          severity="secondary"
          :value="
            dateRange[1]
              ? `${formatDate(dateRange[0])} – ${formatDate(dateRange[1])}`
              : `From ${formatDate(dateRange[0])}`
          "
        />
      </template>

      <Button
        label="Clear all"
        severity="danger"
        outlined
        icon="pi pi-times"
        size="small"
        @click="$emit('clearAll')"
      />
    </div>
  </div>
</template>
