<script setup lang="ts">
const props = defineProps<{
  item: Item
  showSkeleton?: boolean
}>()

const { getEffectiveTitle } = useCommons()
const { isDuplicateStatus, getStatusLabel, getStatusSeverity, getStatusStyle } = useUploadStatus()

const duplicateLinks = computed(() => {
  const error = props.item.meta.errorInfo
  if (!error) return []

  switch (error.type) {
    case 'duplicate':
    case 'duplicated_sdc_updated':
    case 'duplicated_sdc_not_updated':
      return error.links
    default:
      return []
  }
})
</script>

<template>
  <div class="col-span-1 font-medium">{{ item.index }}</div>

  <div class="col-span-8 wrap-anywhere">
    <Skeleton v-if="showSkeleton" />
    <template v-else>
      <ExternalLink
        v-if="item.meta.status === UPLOAD_STATUS.Completed && item.meta.successUrl"
        :href="item.meta.successUrl"
        class="text-green-600 hover:underline"
      >
        File:{{ getEffectiveTitle(item) }}
      </ExternalLink>
      <ExternalLink
        v-else-if="
          item.meta.status && isDuplicateStatus(item.meta.status) && duplicateLinks.length > 0
        "
        :href="duplicateLinks[0]!.url"
        class="text-fuchsia-600 hover:underline"
      >
        File:{{ getEffectiveTitle(item) }}
      </ExternalLink>
      <span v-else>File:{{ getEffectiveTitle(item) }}</span>
    </template>
  </div>

  <div class="col-span-3 flex justify-end">
    <Skeleton v-if="showSkeleton" />
    <template v-else-if="!item.meta.status">
      <Tag severity="secondary">Creating</Tag>
    </template>
    <template v-else-if="item.meta.status === UPLOAD_STATUS.Failed">
      <ErrorDisplay
        v-if="item.meta.errorInfo"
        :error="item.meta.errorInfo"
      />
      <Tag
        v-else
        severity="danger"
      >
        {{ getStatusLabel(item.meta.status) }}: {{ item.meta.statusReason }}
      </Tag>
    </template>
    <Tag
      v-else-if="item.meta.status"
      :severity="getStatusSeverity(item.meta.status)"
      :style="getStatusStyle(item.meta.status)"
    >
      {{ getStatusLabel(item.meta.status) }}
    </Tag>
  </div>
</template>
