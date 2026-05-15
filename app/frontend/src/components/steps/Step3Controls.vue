<script setup lang="ts">
const store = useCollectionsStore()
const { cancelTitleVerification } = useCommons()

const disablePreview = computed(() => {
  if (store.selectedCount === 0) return true
  return store.selectedItems.some(
    (i) =>
      i.meta.selected && i.meta.titleStatus && TITLE_ERROR_STATUSES.includes(i.meta.titleStatus),
  )
})

const onPreviewEdits = () => {
  cancelTitleVerification()
  store.stepper = '4'
}
</script>

<template>
  <div class="flex justify-between items-center">
    <Message
      severity="info"
      icon="pi pi-info-circle"
    >
      Displaying {{ store.showSelectedOnly ? 'only selected' : 'all' }} items
    </Message>
    <Button
      icon="pi pi-eye"
      icon-pos="left"
      label="Preview edits"
      :severity="disablePreview ? 'secondary' : 'primary'"
      :disabled="disablePreview"
      @click="onPreviewEdits"
    />
  </div>
</template>
