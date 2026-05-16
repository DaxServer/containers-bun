<script setup lang="ts">
const props = defineProps<{
  isEditing: boolean
  presetTitle?: string
}>()

const emit = defineEmits<{
  save: [data: { title: string; setAsDefault: boolean }]
  cancel: []
}>()

const store = useCollectionsStore()

const title = ref('')
const setAsDefault = ref(false)

// Pre-fill title and checkbox when editing a preset
watch(
  () => props.presetTitle,
  (newTitle) => {
    if (props.isEditing && newTitle) {
      title.value = newTitle
      const preset = store.presets.find((p) => p.title === newTitle)
      setAsDefault.value = preset?.is_default ?? false
    } else {
      title.value = ''
      setAsDefault.value = false
    }
  },
  { immediate: true },
)

const handleSave = () => {
  const trimmedTitle = title.value.trim()
  if (!trimmedTitle) return

  emit('save', { title: trimmedTitle, setAsDefault: setAsDefault.value })
}
</script>

<template>
  <div class="flex flex-col gap-3 mt-4 p-4 bg-surface-50 border border-surface-200 rounded">
    <div>
      <FloatLabel variant="on">
        <InputText
          v-model="title"
          id="preset_title"
          fluid
        />
        <label for="preset_title">Preset name</label>
      </FloatLabel>
    </div>

    <div class="flex items-center gap-3">
      <Button
        :label="isEditing ? 'Update preset' : 'Save preset for re-use'"
        :icon="isEditing ? 'pi pi-pencil' : 'pi pi-bookmark'"
        :disabled="!title.trim()"
        size="small"
        @click="handleSave"
      />

      <Button
        v-if="isEditing"
        label="Cancel"
        severity="danger"
        outlined
        size="small"
        @click="$emit('cancel')"
      />

      <div class="flex items-center gap-2">
        <Checkbox
          v-model="setAsDefault"
          binary
          input-id="set_default"
        />
        <label for="set_default">Set as default</label>
      </div>
    </div>
  </div>
</template>
