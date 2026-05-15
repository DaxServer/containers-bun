<script setup lang="ts">
defineProps<{
  stats: BatchStats
}>()

const { getStatusSeverity, getStatusStyle } = useUploadStatus()
</script>

<template>
  <div class="flex items-center gap-1">
    <Tag
      v-if="stats.completed > 0"
      :severity="getStatusSeverity(UPLOAD_STATUS.Completed)"
      :style="getStatusStyle(UPLOAD_STATUS.Completed)"
      :value="`${stats.completed} uploaded`"
    />
    <Tag
      v-if="stats.duplicate > 0"
      :severity="getStatusSeverity(UPLOAD_STATUS.Duplicate)"
      :value="`${stats.duplicate} duplicate${stats.duplicate > 1 ? 's' : ''}`"
      :style="getStatusStyle(UPLOAD_STATUS.Duplicate)"
    />
    <Tag
      v-if="stats.failed > 0"
      :severity="getStatusSeverity(UPLOAD_STATUS.Failed)"
      :style="getStatusStyle(UPLOAD_STATUS.Failed)"
      :value="`${stats.failed} failed`"
    />
    <Tag
      v-if="stats.in_progress > 0"
      :severity="getStatusSeverity(UPLOAD_STATUS.InProgress)"
      :style="getStatusStyle(UPLOAD_STATUS.InProgress)"
      :value="`${stats.in_progress} in progress`"
    />
    <Tag
      v-if="stats.queued > 0"
      :severity="getStatusSeverity(UPLOAD_STATUS.Queued)"
      :style="getStatusStyle(UPLOAD_STATUS.Queued)"
      :value="`${stats.queued} queued`"
    />
    <Tag
      v-if="stats.cancelled > 0"
      :severity="getStatusSeverity(UPLOAD_STATUS.Cancelled)"
      :style="getStatusStyle(UPLOAD_STATUS.Cancelled)"
      :value="`${stats.cancelled} cancelled`"
    />
  </div>
</template>
