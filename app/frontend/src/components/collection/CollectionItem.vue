<script setup lang="ts">
const props = defineProps<{
  item: Item
  altPrefix: string
}>()

const store = useCollectionsStore()
const { isDuplicateStatus } = useUploadStatus()

const onToggleSelect = () => {
  store.updateItem(props.item.id, 'selected', !props.item.meta.selected)
}

const getSelectionRowClass = (item: Item) => {
  return item.meta.selected ? 'bg-green-100!' : ''
}

const getStatusRowClass = (item: Item) => {
  const status = item.meta.status
  if (status === UPLOAD_STATUS.Completed) return 'bg-green-100'
  if (status === UPLOAD_STATUS.Failed) return 'bg-red-100'
  if (status && isDuplicateStatus(status)) return 'bg-fuchsia-50' // Fixed color for duplicate
  if (status === UPLOAD_STATUS.InProgress) return 'bg-blue-100'
  return ''
}

// Container class: Different layouts per step
const containerClass = computed(() => {
  const base = 'transition-colors duration-200 '

  // STEP 2: Flex-row with green background for selection
  if (store.stepper === '2') {
    return `${base}flex flex-row p-4 border-b border-surface-200 gap-6 ${getSelectionRowClass(props.item)}`
  }

  // STEP 3: Flex-col with border-l-4 for title status
  if (store.stepper === '3') {
    const status = props.item.meta.titleStatus
    const existing = props.item.image.existing.length > 0
    let borderColor = 'border-l-surface-200'

    if (status && TITLE_ERROR_STATUSES.includes(status)) borderColor = 'border-l-red-500'
    else if (status === TITLE_STATUS.Unknown) borderColor = 'border-l-yellow-500'
    else if (status === TITLE_STATUS.Available) {
      borderColor = existing ? 'border-l-yellow-500' : 'border-l-green-600'
    }
    return `${base}flex flex-col p-4 py-6 border-b border-surface-200 border-l-4 ${borderColor}`
  }

  // STEP 4: Flex-row, no selection styling
  if (store.stepper === '4') {
    return `${base}flex flex-row p-4 border-b border-surface-200 hover:bg-surface-50 gap-6`
  }

  // STEP 5: Grid layout for status display
  if (store.stepper === '5') {
    return `${base}grid grid-cols-12 gap-4 p-4 border-b border-surface-200 items-center ${getStatusRowClass(props.item)}`
  }

  return base
})

// Image wrapper: larger for step 2, 3, w-64 for step 4
const imageWrapperClass = computed(() => {
  if (store.stepper === '4') {
    // Step 4: Smaller width
    return 'w-64 flex-none'
  }
  return 'max-w-3xl flex-none'
})

// Content wrapper: same for all steps (except step 3 which doesn't use it)
const contentWrapperClass = computed(() => {
  return 'flex-1 min-w-0 flex flex-col'
})

const imageClass = computed(() => {
  if (store.stepper === '2') {
    return 'cursor-pointer w-full h-full object-cover'
  }
  return 'w-full'
})
</script>

<template>
  <div :class="containerClass">
    <!-- Permanent Skeleton -->
    <template v-if="item.isSkeleton">
      <MediaSkeleton
        v-if="store.stepper !== '5'"
        :layout="store.stepper === '2' && store.viewMode === 'grid' ? 'grid' : 'list'"
      />
      <Skeleton
        v-else
        class="h-8 col-span-12"
      />
    </template>

    <template v-else>
      <!-- === STEP 5: Special grid layout === -->
      <template v-if="store.stepper === '5'">
        <slot
          name="status-content"
          :item="item"
        />
      </template>

      <!-- === STEPS 2, 3, 4: Single Image, layouts via conditional wrappers === -->
      <template v-else>
        <!-- STEP 3: Top slot (only shown in step 3) -->
        <div
          v-if="store.stepper === '3'"
          class="mb-4"
        >
          <slot
            name="edit-content-top"
            :item="item"
          />
        </div>

        <!-- Shared Image row -->
        <div class="flex gap-4">
          <div :class="imageWrapperClass">
            <Image
              :src="item.image.urls.preview"
              :alt="`${altPrefix} ${item.id}`"
              :class="imageClass"
              @click.stop="store.stepper === '2' ? onToggleSelect() : null"
            />
            <slot name="image-footer" />
          </div>

          <!-- Right side content -->
          <div v-if="store.stepper === '3'">
            <slot
              name="edit-content-right"
              :item="item"
            />
          </div>
          <div
            v-else
            :class="contentWrapperClass"
          >
            <template v-if="store.stepper === '2'">
              <slot
                name="metadata"
                :item="item"
              />
            </template>
            <div v-else-if="store.stepper === '4'">
              <slot
                name="preview-content"
                :item="item"
              />
            </div>
          </div>
        </div>

        <!-- STEP 3: Bottom slot (only shown in step 3) -->
        <div
          v-if="store.stepper === '3'"
          class="mt-4"
        >
          <slot
            name="edit-content-bottom"
            :item="item"
          />
        </div>
      </template>
    </template>
  </div>
</template>
