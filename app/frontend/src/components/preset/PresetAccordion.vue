<script setup lang="ts">
defineProps<{
  isOpen: boolean
  presets: PresetItem[]
  currentPresetId: number | null
}>()

const emit = defineEmits<{
  select: [id: number]
  create: []
}>()

const handleSelect = (id: number) => {
  emit('select', id)
}

const handleCreate = () => {
  emit('create')
}
</script>

<template>
  <Transition name="accordion">
    <div
      v-if="isOpen"
      class="flex flex-col gap-3 mt-4 overflow-hidden"
    >
      <!-- All presets -->
      <PresetListItem
        v-for="preset in presets"
        :key="preset.id"
        :preset="preset"
        :is-selected="currentPresetId === preset.id"
        @click="handleSelect(preset.id)"
      />

      <!-- Create new preset button -->
      <div class="flex justify-start">
        <Button
          label="Create new preset"
          icon="pi pi-plus"
          severity="primary"
          @click="handleCreate"
        />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.accordion-enter-active,
.accordion-leave-active {
  transition: all 300ms ease-in-out;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  max-height: 0;
  opacity: 0;
}

.accordion-enter-to,
.accordion-leave-from {
  opacity: 1;
}
</style>
