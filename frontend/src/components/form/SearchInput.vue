<script setup lang="ts">
defineProps<{
  modelValue: string
  placeholder: string
  id: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  clear: []
  enter: []
}>()

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <FloatLabel variant="on">
    <IconField>
      <InputIcon class="pi pi-search" />
      <InputText
        :id="id"
        :model-value="modelValue"
        class="min-w-xs"
        @update:model-value="emit('update:modelValue', $event ?? '')"
        @keydown.enter="emit('enter')"
      />
      <InputIcon
        v-if="loading"
        class="pi pi-spinner pi-spin"
      />
      <InputIcon
        v-else-if="modelValue"
        class="pi pi-times cursor-pointer"
        @click="handleClear"
      />
    </IconField>
    <label :for="id">{{ placeholder }}</label>
  </FloatLabel>
</template>
