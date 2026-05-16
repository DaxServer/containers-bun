<script setup lang="ts">
const store = useCollectionsStore()
const confirm = useConfirm()

onBeforeRouteLeave((to) => {
  // Skip confirmation if navigating to another collection route
  if (to.name === 'mapillary') return true

  // Step 5: Show confirmation if batch is still being created
  if (store.stepper === '5' && !store.isBatchCreated && store.batchId) {
    return new Promise((resolve) => {
      confirm.require({
        message: 'Uploads are still being created. Are you sure you want to leave?',
        header: 'Confirm navigation',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Leave',
        rejectLabel: 'Stay',
        accept: () => {
          store.$reset()
          resolve(true)
        },
        reject: () => {
          resolve(false)
        },
      })
    })
  }

  // Steps 2-4: Show confirmation if user has unsaved work
  if (['2', '3', '4'].includes(store.stepper)) {
    return new Promise((resolve) => {
      confirm.require({
        message: 'You have unsaved changes. Are you sure you want to leave?',
        header: 'Confirm navigation',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Leave',
        rejectLabel: 'Stay',
        accept: () => {
          store.$reset()
          resolve(true)
        },
        reject: () => {
          resolve(false)
        },
      })
    })
  }

  // Step 1 or no work in progress: just reset and leave
  store.$reset()

  return true
})
</script>

<template>
  <slot />
</template>
