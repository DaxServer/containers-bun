<script setup lang="ts">
defineProps<{
  group: BatchFailureGroup
}>()
</script>

<template>
  <div class="border border-gray-200 rounded-lg mb-4 bg-white">
    <!-- Batch Header -->
    <div class="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-start">
      <div class="flex items-center gap-3 flex-wrap">
        <strong>Batch #{{ group.batch.id }}</strong>
        <span class="text-xs text-gray-500">Edit Group: {{ group.batch.editGroupId }}</span>
        <span class="bg-red-50 text-red-600 border border-red-200 px-2 py-2 rounded text-xs">
          {{ group.batch.failedCount }} failed / {{ group.batch.totalUploads }} total
        </span>
        <div class="inline-block p-2 rounded bg-sky-50 border border-sky-200 text-xs">
          <span class="inline">
            <strong>User:</strong>
            {{ group.user.username }}
          </span>
          <span class="mx-4 text-gray-600 inline">•</span>
          <span class="inline">
            <strong>Handler:</strong>
            {{ group.batch.handler }}
          </span>
          <span class="mx-4 text-gray-600 inline">•</span>
          <span class="inline">
            <strong>Created:</strong>
            {{ new Date(group.batch.createdAt).toLocaleString() }}
          </span>
        </div>
      </div>
    </div>

    <FailedUploadRow
      v-for="upload in group.failedUploads"
      :key="upload.id"
      :upload="upload"
    />
    <div
      v-if="group.failedUploads.length === 0"
      class="p-4 text-center text-gray-500 text-xs"
    >
      No failed uploads (filtered out)
    </div>
  </div>
</template>
