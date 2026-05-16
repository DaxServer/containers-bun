<script setup lang="ts">
const props = defineProps<{ altPrefix: string }>()

const store = useCollectionsStore()
const { sendUnsubscribeBatch, startUploadProcess } = useCollections()

const dataViewPage = ref<DataViewPageEvent | null>(null)
const dataViewFirst = ref(0)

// Scroll to top when pagination changes (steps 2, 3, 4)
watch(dataViewPage, () => {
  window.scroll({ top: 0, behavior: 'smooth' })
})

const onPageChange = (event: DataViewPageEvent) => {
  dataViewPage.value = event
  dataViewFirst.value = event.first
}

// Step 2 pagination
const step2GetRowsPerPage = computed(() => (store.viewMode === 'grid' ? 24 : 10))
const step2RowsPerPageOptions = computed(() => {
  if (store.viewMode === 'grid') return [24, 48, 72, 96]
  return [10, 25, 50, 100]
})

const step2OnSelectCurrentPage = () => {
  if (dataViewPage.value) {
    store.selectPage(dataViewPage.value.first, dataViewPage.value.rows)
  } else {
    store.selectPage(0, step2GetRowsPerPage.value)
  }
}

// Step 3 filter errors only
const showErrorsOnly = ref(false)

// Step 5 skeleton
const showSkeleton = ref(false)
const skeletonRows = computed<Item[]>(() =>
  Array.from(
    { length: 10 },
    (_, i) =>
      ({
        id: `skeleton-${i + 1}`,
        index: i + 1,
        isSkeleton: true,
        meta: {
          selected: false,
          description: { language: '', value: '' },
          categories: '',
        },
      }) as unknown as Item,
  ),
)

const getRowsPerPage = computed(() => {
  return store.stepper === '2' ? step2GetRowsPerPage.value : 10
})

// Hide images list and step 3 controls when editing preset or accordion is open
const shouldHideDataView = computed(() => {
  return store.stepper === '3' && (store.isEditingPreset || store.isAccordionOpen)
})

const shouldHideStep3Controls = computed(() => {
  return store.isEditingPreset || store.isAccordionOpen
})

const rowsPerPageOptions = computed(() => {
  if (store.stepper === '2') return step2RowsPerPageOptions.value
  if (store.stepper === '3') {
    return [10, 20, 50]
  }
  if (store.stepper === '4') {
    const total = store.selectedItems.length
    const options = [10, 25, 50, 100]
    if (total > 0 && !options.includes(total)) {
      options.push(total)
    }
    return options.sort((a, b) => a - b)
  }
  return [10, 25, 50, 100]
})

// --- Shared Computing ---
const currentItems = computed(() => {
  switch (store.stepper) {
    case '2':
      return store.itemsArray
    case '3':
      if (showErrorsOnly.value) {
        return store.selectedItems.filter(
          (i) => i.meta.titleStatus && TITLE_ERROR_STATUSES.includes(i.meta.titleStatus),
        )
      }
      return store.selectedItems
    case '4':
      return store.selectedItems
    case '5':
      return showSkeleton.value ? skeletonRows.value : store.selectedItems
    default:
      return []
  }
})

const currentLayout = computed(() => {
  return store.stepper === '2' ? store.viewMode : 'list'
})

// --- Lifecycle ---
watch(
  () => store.stepper,
  (newStep, oldStep) => {
    if (newStep !== oldStep) {
      dataViewPage.value = null
      dataViewFirst.value = 0
    }

    window.scroll({ top: 0, behavior: 'smooth' })

    if (newStep === '5') {
      showSkeleton.value = true
      setTimeout(() => {
        showSkeleton.value = false
        startUploadProcess()
      }, 100)
    }

    if (oldStep === '5') {
      sendUnsubscribeBatch()
    }
  },
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Step 3 header -->
    <template v-if="store.stepper === '3'">
      <Step3Header />
      <template v-if="!shouldHideStep3Controls">
        <div class="max-w-7xl mx-auto w-full">
          <Step3ErrorBanner @toggle-filter="showErrorsOnly = $event" />
        </div>
        <div class="max-w-7xl mx-auto w-full">
          <Step3Controls />
        </div>
      </template>
    </template>

    <!-- Step 4 header -->
    <div v-if="store.stepper === '4'">
      <Step4Header />
    </div>

    <div :class="store.stepper === '3' && 'max-w-7xl mx-auto w-full'">
      <DataView
        v-if="!shouldHideDataView"
        :value="currentItems"
        data-key="id"
        :layout="currentLayout"
        :paginator="store.stepper !== '5'"
        :rows="getRowsPerPage"
        :first="dataViewFirst"
        paginator-position="both"
        :always-show-paginator="false"
        :rows-per-page-options="rowsPerPageOptions"
        paginator-template="Rows RowsPerPageDropdown FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport JumpToPageDropdown"
        current-page-report-template="Page {currentPage} of {totalPages}"
        :page-link-size="10"
        @page="onPageChange"
        :pt="{
          pcPaginator: {
            root: {
              class: store.stepper === '2' ? 'justify-start!' : 'justify-end!',
            },
          },
        }"
      >
        <template #header>
          <div v-if="store.stepper === '2'">
            <CollectionsControls @select:current-page="step2OnSelectCurrentPage" />
          </div>
          <div v-if="store.stepper === '5'">
            <Step5Header />
          </div>
        </template>

        <template #empty>
          <Message
            severity="info"
            icon="pi pi-info-circle"
          >
            No items to display
          </Message>
        </template>

        <template #grid="slotProps">
          <div
            v-if="store.stepper === '2'"
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            <SelectionItem
              v-for="item in slotProps.items"
              :key="item.id"
              :item="item"
              :alt-prefix="altPrefix"
              layout="grid"
            >
              <template #metadata="itemProps">
                <slot
                  name="metadata"
                  :item="itemProps.item"
                />
              </template>
            </SelectionItem>
          </div>
        </template>

        <template #list="slotProps">
          <div class="flex flex-col">
            <template
              v-for="item in slotProps.items"
              :key="item.id"
            >
              <CollectionItem
                :item="item"
                :alt-prefix="altPrefix"
              >
                <!-- Step 2: Metadata slot -->
                <template #metadata="slotPropsInner">
                  <slot
                    name="metadata"
                    :item="slotPropsInner.item"
                  />
                </template>

                <!-- Step 3: Edit content slots -->
                <template #edit-content-top="slotPropsInner">
                  <EditContentTop
                    :item="slotPropsInner.item"
                    :altPrefix="altPrefix"
                  />
                </template>
                <template #edit-content-right="slotPropsInner">
                  <EditContentRight
                    :item="slotPropsInner.item"
                    :altPrefix="altPrefix"
                  />
                </template>
                <template #edit-content-bottom="slotPropsInner">
                  <EditContentBottom
                    :item="slotPropsInner.item"
                    :altPrefix="altPrefix"
                  />
                </template>

                <!-- Step 4: Preview content -->
                <template #preview-content="slotPropsInner">
                  <PreviewContent
                    :item="slotPropsInner.item"
                    :altPrefix="altPrefix"
                  />
                </template>

                <!-- Step 5: Status content -->
                <template #status-content="slotPropsInner">
                  <StatusContent
                    :item="slotPropsInner.item"
                    :showSkeleton="showSkeleton"
                  />
                </template>
              </CollectionItem>
            </template>
          </div>
        </template>
      </DataView>
    </div>
  </div>
</template>
