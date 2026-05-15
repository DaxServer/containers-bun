<script setup lang="ts">
defineProps<{
  preset: PresetItem | null
  isSelected: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <div
    class="relative border rounded p-4 cursor-pointer hover:shadow-sm"
    :class="{
      'border-2 border-primary bg-primary-50': isSelected && preset,
      'border-surface-200 bg-surface-0': !isSelected || !preset,
    }"
    @click="$emit('click')"
  >
    <!-- Selected preset: checkmark icon at top-right -->
    <div
      v-if="isSelected && preset"
      class="absolute top-2 right-2"
    >
      <div class="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">
        <i class="pi pi-check text-xs" />
      </div>
    </div>

    <!-- Preset header: name + badges -->
    <div class="flex items-center gap-2 mb-3">
      <h3 class="font-semibold text-lg">{{ preset?.title || 'None (manual)' }}</h3>
      <Tag
        v-if="preset?.is_default"
        value="Default"
        severity="success"
        size="small"
      />
    </div>

    <!-- Preset details (for actual presets only) -->
    <PresetPreview
      v-if="preset"
      :preset="preset"
    />

    <!-- None (manual) description -->
    <div
      v-else
      class="text-sm text-surface-500"
    >
      No preset selected. Configure all fields manually.
    </div>
  </div>
</template>
