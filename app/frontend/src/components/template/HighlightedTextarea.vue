<script setup lang="ts">
defineProps<{
  modelValue: string
  highlighted: string
  rows?: number
  invalid?: boolean
}>()

defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <div class="relative grid w-full">
    <div
      class="col-start-1 row-start-1 p-3 text-md leading-snug font-mono whitespace-pre-wrap break-words border border-transparent pointer-events-none text-gray-900"
      aria-hidden="true"
      v-html="highlighted"
    />
    <Textarea
      :model-value="modelValue"
      :rows="rows ?? 1"
      :invalid="invalid"
      auto-resize
      fluid
      class="col-start-1 row-start-1 !bg-transparent !text-transparent caret-gray-900 !p-3 !text-md !leading-snug !font-mono shadow-none"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>
