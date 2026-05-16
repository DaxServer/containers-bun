<script setup lang="ts">
const store = useCollectionsStore()

defineProps<{
  isEditing: boolean
}>()

const emit = defineEmits<{
  edit: []
  discard: []
  select: [id: number]
  create: []
  remove: []
}>()

const toggleAccordion = () => {
  store.toggleAccordion()
}

const handlePresetSelect = (id: number) => {
  emit('select', id)
  store.setAccordionOpen(false)
}

const handleCreate = () => {
  emit('create')
  store.setAccordionOpen(false)
}

const handleRemove = () => {
  emit('remove')
}
</script>

<template>
  <div class="flex flex-col w-full">
    <!-- Toolbar row -->
    <div class="flex justify-between items-center w-full">
      <div class="flex items-center gap-3">
        <span class="text-md text-surface-700">Preset:</span>

        <!-- Current preset display (bold when selected) -->
        <span
          class="text-md"
          :class="{ 'font-bold': store.currentPresetId }"
        >
          {{ store.currentPreset?.title || 'None (manual)' }}
        </span>

        <!-- Default badge -->
        <Tag
          v-if="store.currentPreset?.is_default"
          value="Default"
          severity="success"
          size="small"
        />

        <!-- Edit button -->
        <Button
          v-if="store.currentPresetId && !isEditing"
          label="Edit"
          icon="pi pi-pencil"
          size="small"
          outlined
          @click="$emit('edit')"
        />

        <!-- Remove preset button -->
        <Button
          v-if="store.currentPresetId && !isEditing"
          label="Remove preset"
          icon="pi pi-times"
          size="small"
          severity="danger"
          outlined
          @click="handleRemove"
        />
      </div>

      <!-- Change preset button (right-aligned) -->
      <Button
        v-if="!isEditing"
        label="Change preset"
        :icon="store.isAccordionOpen ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
        size="small"
        outlined
        @click="toggleAccordion"
      />
    </div>

    <Divider />

    <!-- Accordion content -->
    <PresetAccordion
      :is-open="store.isAccordionOpen"
      :presets="store.presets"
      :current-preset-id="store.currentPresetId"
      @select="handlePresetSelect"
      @create="handleCreate"
    />
  </div>
</template>
