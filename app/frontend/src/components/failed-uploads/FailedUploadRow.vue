<script setup lang="ts">
defineProps<{
  upload: FailedUpload
}>()
</script>

<template>
  <div class="p-4 border-b border-gray-100">
    <div class="flex items-center gap-2">
      <span class="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">
        {{ upload.filename }}
      </span>
      <span class="text-xs text-gray-500">{{ new Date(upload.createdAt).toLocaleString() }}</span>
    </div>
    <div
      v-if="upload.error"
      class="mt-2"
    >
      <!-- Duplicate error with links -->
      <div
        v-if="
          upload.error.type === UPLOAD_STATUS.Duplicate ||
          upload.error.type === UPLOAD_STATUS.DuplicatedSdcNotUpdated ||
          upload.error.type === UPLOAD_STATUS.DuplicatedSdcUpdated
        "
        class="p-2 bg-yellow-50 rounded border-l-3 border-yellow-600"
      >
        <p class="text-xs font-semibold text-yellow-800 mb-1">
          {{ upload.error.message }}
        </p>
        <div class="flex flex-wrap gap-2 mt-2">
          <a
            v-for="link in upload.error.links"
            :key="link.url"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-900 px-2 py-1 rounded transition-colors"
          >
            {{ link.title }}
          </a>
        </div>
      </div>
      <!-- Generic error -->
      <div
        v-else
        class="p-2 bg-red-50 rounded border-l-3 border-red-600 text-xs font-mono whitespace-pre-wrap text-red-800"
      >
        {{ upload.error.message }}
      </div>
    </div>
    <div
      v-else
      class="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 italic"
    >
      Unknown error
    </div>
  </div>
</template>
