<script setup lang="ts" generic="T">
withDefaults(
  defineProps<{
    value: readonly T[]
    columns: { field: string; header: string }[]
    totalRecords?: number
    rows?: number
    first?: number
    lazy?: boolean
    loading?: boolean
    loadingRows?: number
    alwaysShowPaginator?: boolean
  }>(),
  {
    rows: 100,
    lazy: false,
    loading: false,
    loadingRows: 5,
    alwaysShowPaginator: false,
  },
)

defineEmits<{
  page: [DataTablePageEvent]
}>()
</script>

<template>
  <DataTable
    v-bind="$attrs"
    :value="loading && (!value || value.length === 0) ? Array(loadingRows).fill({}) : value"
    paginator
    paginatorPosition="both"
    paginator-template="Rows RowsPerPageDropdown FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport JumpToPageDropdown"
    current-page-report-template="Page {currentPage} of {totalPages}"
    :alwaysShowPaginator="alwaysShowPaginator"
    :rows="rows"
    :totalRecords="totalRecords"
    :first="first"
    :lazy="lazy"
    @page="$emit('page', $event)"
  >
    <Column
      v-for="col of columns"
      :key="col.field"
      :field="col.field"
      :header="col.header"
    >
      <template #body="slotProps">
        <Skeleton v-if="loading && (!value || value.length === 0)" />
        <slot
          v-else
          name="body-cell"
          :col="col"
          :data="slotProps.data"
        >
          {{ slotProps.data[col.field] }}
        </slot>
      </template>
    </Column>
    <template #header>
      <slot name="header"></slot>
    </template>
    <template #empty>
      <div class="text-center py-4">No data available</div>
    </template>
  </DataTable>
</template>
