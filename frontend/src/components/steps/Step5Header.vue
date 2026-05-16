<script setup lang="ts">
const store = useCollectionsStore()
const { isDuplicateStatus } = useUploadStatus()
const { retryUploads, sendUnsubscribeBatch } = useCollections()

const total = computed(() => Math.max(1, store.selectedItems.length))

const creationProgress = computed<MeterItem[]>(() => {
  const uploadRequested = store.selectedItems.filter(
    (item) => item.meta.status !== undefined,
  ).length

  return [
    {
      label: 'Queued',
      value: (uploadRequested * 100) / total.value,
      color: 'var(--p-surface-500)',
    },
  ]
})

const uploadProgress = computed<MeterItem[]>(() => {
  const successful = store.selectedItems.filter(
    (item) => item.meta.status === UPLOAD_STATUS.Completed,
  ).length
  const inProgress = store.selectedItems.filter(
    (item) => item.meta.status === UPLOAD_STATUS.InProgress,
  ).length
  const failed = store.selectedItems.filter(
    (item) => item.meta.status === UPLOAD_STATUS.Failed,
  ).length
  const duplicate = store.selectedItems.filter(
    (item) => item.meta.status && isDuplicateStatus(item.meta.status),
  ).length
  const queued = store.selectedItems.filter(
    (item) => item.meta.status === UPLOAD_STATUS.Queued,
  ).length

  return [
    { label: 'Successful', value: (successful * 100) / total.value, color: 'var(--p-green-500)' },
    { label: 'Duplicate', value: (duplicate * 100) / total.value, color: 'var(--p-fuchsia-800)' },
    { label: 'Failed', value: (failed * 100) / total.value, color: 'var(--p-red-500)' },
    { label: 'Processing', value: (inProgress * 100) / total.value, color: 'var(--p-blue-500)' },
    { label: 'Queued', value: (queued * 100) / total.value, color: 'var(--p-gray-300)' },
  ]
})

const canRetry = computed(() => {
  const hasFailed = store.selectedItems.some((item) => item.meta.status === UPLOAD_STATUS.Failed)
  const isCompleted = !store.selectedItems.some(
    (item) =>
      item.meta.status === UPLOAD_STATUS.InProgress || item.meta.status === UPLOAD_STATUS.Queued,
  )
  return hasFailed && !!store.batchId && isCompleted
})

const onRetry = () => {
  if (store.batchId) {
    retryUploads(store.batchId)
  }
}

onUnmounted(() => {
  sendUnsubscribeBatch()
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-xl font-bold">
        {{ store.isBatchCreated ? 'Upload status' : 'Queueing uploads...' }}
      </span>
      <Button
        v-if="canRetry"
        icon="pi pi-refresh"
        severity="danger"
        label="Retry Failed"
        @click="onRetry"
        size="small"
      />
    </div>
    <MeterGroup :value="store.isBatchCreated ? uploadProgress : creationProgress" />
  </div>
</template>
