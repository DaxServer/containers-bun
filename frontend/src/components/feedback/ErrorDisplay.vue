<script setup lang="ts">
defineProps<{ error: StructuredError }>()
</script>

<template>
  <div class="text-sm">
    <template
      v-if="
        error.type === 'duplicate' ||
        error.type === 'duplicated_sdc_updated' ||
        error.type === 'duplicated_sdc_not_updated'
      "
    >
      <div v-if="error.links.length > 0">
        <span class="font-semibold text-fuchsia-800">Duplicates:</span>
        <ul class="list-disc list-inside">
          <li
            v-for="(link, idx) in error.links"
            :key="idx"
          >
            <ExternalLink
              :href="decodeURIComponent(link.url)"
              class="text-primary"
            >
              {{ link.title }}
            </ExternalLink>
          </li>
        </ul>
      </div>
      <div
        v-if="error.type === 'duplicated_sdc_updated'"
        class="text-xs text-gray-500 mt-1"
      >
        SDC merged and updated
      </div>
      <div
        v-if="error.type === 'duplicated_sdc_not_updated'"
        class="text-xs text-gray-500 mt-1"
      >
        SDC already up to date
      </div>
    </template>

    <template v-else-if="error.type === 'title_blacklisted'">
      <div class="text-orange-600">
        <span class="font-semibold">Title Blacklisted:</span>
        {{ error.message }}
      </div>
    </template>

    <div
      v-else
      class="text-red-500"
    >
      {{ error.message }}
    </div>
  </div>
</template>
