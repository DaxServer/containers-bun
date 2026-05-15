import { useCollections } from '@/composables/useCollections'
import { useTitleTemplate } from '@/composables/useTitleTemplate'
import { useCollectionsStore } from '@/stores/collections.store'
import type { SavePreset } from '@/types/asyncapi'
import { useToast } from 'primevue/usetoast'
import { ref, watch } from 'vue'

export const usePresetManager = () => {
  const store = useCollectionsStore()
  const { savePreset } = useCollections()
  const { verifyTitlesWithTemplate } = useTitleTemplate()
  const toast = useToast()

  const isEditing = ref(false)
  const isCreatingPreset = ref(false)
  const presetIdBeingEdited = ref<number | null>(null)
  const hasAutoAppliedDefault = ref(false)
  const pendingPresetSave = ref<{ id?: number; title?: string } | null>(null)

  const selectPreset = async (presetId: number) => {
    const preset = store.presets.find((p) => p.id === presetId)
    if (!preset) return
    store.applyPreset(preset)
    isEditing.value = false
    await verifyTitlesWithTemplate()
  }

  const clearPreset = () => {
    store.setActivePreset(null)
    isEditing.value = false
    isCreatingPreset.value = false
  }

  const handleEditPreset = () => {
    if (store.currentPresetId === null) return
    isEditing.value = true
    presetIdBeingEdited.value = store.currentPresetId
    store.setEditingPreset(true)
  }

  const handleCancelEdit = async () => {
    // Reset UI state immediately for responsive feedback
    isEditing.value = false
    isCreatingPreset.value = false
    store.setEditingPreset(false)

    // Then restore preset values in background
    if (presetIdBeingEdited.value !== null) {
      const preset = store.presets.find((p) => p.id === presetIdBeingEdited.value)
      if (preset) {
        store.applyPreset(preset)
        await verifyTitlesWithTemplate()
      }
    }
  }

  const handlePresetSave = async ({
    title,
    setAsDefault: isDefault,
  }: {
    title: string
    setAsDefault: boolean
  }) => {
    const data: SavePreset['data'] = {
      title,
      title_template: store.globalTitleTemplate,
      labels: {
        language: store.globalLanguage,
        value: store.globalDescription,
      },
      categories: store.globalCategories,
      exclude_from_date_category: !store.globalDateCategory,
      is_default: isDefault,
      handler: store.handler,
    }

    if (presetIdBeingEdited.value) {
      data.preset_id = presetIdBeingEdited.value
      pendingPresetSave.value = { id: presetIdBeingEdited.value }
    } else {
      pendingPresetSave.value = { title }
    }

    savePreset(data)
    isEditing.value = false
    store.setEditingPreset(false)

    const isUpdate = !!data.preset_id
    toast.add({
      severity: 'success',
      summary: isUpdate ? 'Preset updated' : 'Preset saved',
      detail: isUpdate
        ? `Preset "${data.title}" has been updated successfully.`
        : `Preset "${data.title}" has been saved successfully.`,
      life: 3000,
    })
  }

  // Watch for preset updates after save to restore/set currentPresetId
  watch(
    () => store.presets,
    (newPresets) => {
      const pending = pendingPresetSave.value
      if (!pending) return

      if (pending.id) {
        store.setActivePreset(pending.id)
        pendingPresetSave.value = null
      } else if (pending.title) {
        const newPreset = newPresets.findLast((p) => p.title === pending.title)
        if (newPreset) {
          store.setActivePreset(newPreset.id)
          isCreatingPreset.value = false
          pendingPresetSave.value = null
        }
      }
    },
  )

  // Auto-apply default preset on initial load (once only)
  watch(
    () => store.presets,
    async (presets) => {
      if (pendingPresetSave.value) return
      if (
        presets.length > 0 &&
        store.defaultPreset &&
        !store.currentPresetId &&
        !hasAutoAppliedDefault.value
      ) {
        store.applyPreset(store.defaultPreset)
        await verifyTitlesWithTemplate()
        hasAutoAppliedDefault.value = true
      }
    },
    { immediate: true },
  )

  return {
    isEditing,
    isCreatingPreset,

    selectPreset,
    clearPreset,
    handleEditPreset,
    handleCancelEdit,
    handlePresetSave,
  }
}
