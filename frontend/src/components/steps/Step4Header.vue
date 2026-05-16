<script setup lang="ts">
const store = useCollectionsStore()
const { submitUpload } = useCollections()
</script>

<template>
  <div class="flex flex-col gap-4">
    <Card class="bg-surface-100">
      <template #content>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <div class="text-xl font-bold">Preview</div>
            <span class="text-sm text-gray-500">
              displaying {{ store.selectedCount }} items to upload
            </span>
          </div>
          <Button
            severity="primary"
            :disabled="store.selectedCount === 0"
            @click="submitUpload"
          >
            <i class="pi pi-cloud-upload mr-2"></i>
            Upload
          </Button>
        </div>
      </template>
    </Card>

    <SdcWarningMessage v-if="store.itemsWithExistingTitlesCount > 0" />

    <SimpleMessage
      severity="info"
      icon="pi pi-info-circle"
    >
      The
      <span
        v-pre
        class="text-primary"
      >
        {{ Information }}
      </span>
      template will be populated from SDC
    </SimpleMessage>
  </div>
</template>
