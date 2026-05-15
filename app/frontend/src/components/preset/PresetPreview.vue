<script setup lang="ts">
defineProps<{
  preset: PresetItem | null
}>()

const LANGUAGE_LABELS: Record<string, string> = { en: 'English', de: 'Deutsch' }
</script>

<template>
  <div class="text-sm text-surface-600 space-y-1">
    <!-- Template -->
    <div class="flex items-center gap-2">
      <span class="font-medium">Template:</span>
      <code
        v-if="preset?.title_template"
        class="font-mono"
      >
        {{ preset.title_template }}
      </code>
      <Tag
        v-else
        value="not configured"
        severity="secondary"
        size="small"
      />
    </div>

    <!-- Language -->
    <div class="flex items-center gap-2">
      <span class="font-medium">Language:</span>
      <template v-if="preset && preset.labels?.value && preset.labels?.language">
        <span>{{ LANGUAGE_LABELS[preset.labels.language] ?? preset.labels.language }}</span>
      </template>
      <Tag
        v-else
        value="not configured"
        severity="secondary"
        size="small"
      />
    </div>

    <!-- Description -->
    <div class="flex items-center gap-2">
      <span class="font-medium">Description:</span>
      <span v-if="preset?.labels?.value">{{ preset.labels.value }}</span>
      <Tag
        v-else
        value="not configured"
        severity="secondary"
        size="small"
      />
    </div>

    <!-- Categories -->
    <div class="flex items-center gap-2">
      <span class="font-medium">Categories:</span>
      <span
        v-if="preset?.categories"
        class="whitespace-pre-wrap"
      >
        {{ preset.categories }}
      </span>
      <Tag
        v-else
        value="not configured"
        severity="secondary"
        size="small"
      />
    </div>

    <!-- Exclude from date category -->
    <div class="flex items-center gap-2">
      <span class="font-medium">Automatic date categorization:</span>
      <i
        v-if="preset?.exclude_from_date_category"
        class="pi pi-times-circle text-red-500"
      />
      <i
        v-else
        class="pi pi-check-circle text-green-600"
      />
    </div>
  </div>
</template>
