import { type Mock, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { effectScope, ref } from 'vue'

// Mock useSocket before any imports that depend on it
export const mockSocketData = ref<string | null>(null)
export const mockSend: Mock<(data: string) => void> = mock(() => {})

const mockSocketImpl = () => ({
  useSocket: {
    data: mockSocketData,
    send: mockSend,
  },
})

mock.module('@/composables/useSocket', mockSocketImpl)
mock.module('../useSocket', mockSocketImpl)

import { resolve } from 'node:path'

mock.module(resolve(__dirname, '../useSocket.ts'), mockSocketImpl)

const mockToastAdd = mock(() => {})
mock.module('primevue/usetoast', () => ({
  useToast: () => ({ add: mockToastAdd }),
}))

import { makePreset } from '@/__tests__/fixtures'
import { useAuthStore } from '@/stores/auth.store'
import { useCollectionsStore } from '@/stores/collections.store'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { usePresetManager } from '../usePresetManager'

const enablePresets = () => {
  const auth = useAuthStore()
  auth.user = 'DaxServer'
}

// usePresetManager creates watchers (via useTitleTemplate) that must be stopped after each test
// to prevent watcher leaks across tests when called outside a component setup context.
let scope = effectScope()
const runManager = () => scope.run(() => usePresetManager())!

describe('usePresetManager', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockSend.mockClear()
    mockSocketData.value = null
    scope = effectScope()
  })

  afterEach(() => {
    scope.stop()
  })

  describe('initial state', () => {
    it('isEditing is false', () => {
      const { isEditing } = runManager()
      expect(isEditing.value).toBe(false)
    })
  })

  describe('selectPreset(presetId)', () => {
    it('applies the matching preset to the store', async () => {
      const store = useCollectionsStore()
      store.setPresets([makePreset({ id: 5 })])
      const { selectPreset } = runManager()

      await selectPreset(5)

      expect(store.currentPresetId).toBe(5)
    })

    it('resets isEditing to false after selecting', async () => {
      const store = useCollectionsStore()
      store.setPresets([makePreset({ id: 5 })])
      const { selectPreset, isEditing } = runManager()
      isEditing.value = true

      await selectPreset(5)

      expect(isEditing.value).toBe(false)
    })

    it('does nothing if preset id is not found', async () => {
      const store = useCollectionsStore()
      const { selectPreset } = runManager()

      await selectPreset(999)

      expect(store.currentPresetId).toBeNull()
    })
  })

  describe('clearPreset()', () => {
    it('clears currentPresetId', () => {
      const store = useCollectionsStore()
      store.setActivePreset(5)
      const { clearPreset } = runManager()

      clearPreset()

      expect(store.currentPresetId).toBeNull()
    })

    it('sets isEditing to false', () => {
      const { clearPreset, isEditing } = runManager()
      isEditing.value = true

      clearPreset()

      expect(isEditing.value).toBe(false)
    })
  })

  describe('handleEditPreset()', () => {
    it('sets isEditing to true when currentPresetId is set', () => {
      const store = useCollectionsStore()
      store.setActivePreset(3)
      const { handleEditPreset, isEditing } = runManager()

      handleEditPreset()

      expect(isEditing.value).toBe(true)
    })

    it('does nothing if currentPresetId is null', () => {
      const { handleEditPreset, isEditing } = runManager()

      handleEditPreset()

      expect(isEditing.value).toBe(false)
    })
  })

  describe('handleCancelEdit()', () => {
    it('sets isEditing to false', async () => {
      const store = useCollectionsStore()
      store.setPresets([makePreset({ id: 7 })])
      store.setActivePreset(7)
      const { handleEditPreset, handleCancelEdit, isEditing } = runManager()
      handleEditPreset()

      await handleCancelEdit()

      expect(isEditing.value).toBe(false)
    })

    it('preserves currentPresetId when cancelling edit', async () => {
      const store = useCollectionsStore()
      store.setPresets([makePreset({ id: 7 })])
      store.setActivePreset(7)
      const { handleEditPreset, handleCancelEdit } = runManager()
      handleEditPreset()

      await handleCancelEdit()

      expect(store.currentPresetId).toBe(7)
    })

    it('restores original preset field values when discarding', async () => {
      const store = useCollectionsStore()
      store.setPresets([makePreset({ id: 7, title_template: 'Original template.jpg' })])
      store.setActivePreset(7)
      const { handleEditPreset, handleCancelEdit } = runManager()
      handleEditPreset()

      // Simulate user changing the template while editing
      store.globalTitleTemplate = 'User modified template.jpg'

      await handleCancelEdit()

      expect(store.globalTitleTemplate).toBe('Original template.jpg')
    })
  })

  describe('handlePresetSave() - update existing preset', () => {
    it('calls send() with preset_id when isEditing and presetIdBeingEdited is set', async () => {
      enablePresets()
      const store = useCollectionsStore()
      store.setActivePreset(4)
      const { handleEditPreset, handlePresetSave } = runManager()
      handleEditPreset()

      await handlePresetSave({ title: 'My Preset', setAsDefault: false })

      expect(mockSend).toHaveBeenCalledTimes(1)
      const sent = JSON.parse(mockSend.mock.calls[0]![0])
      expect(sent.data.preset_id).toBe(4)
    })

    it('resets isEditing to false after save', async () => {
      enablePresets()
      const store = useCollectionsStore()
      store.setActivePreset(4)
      const { handleEditPreset, handlePresetSave, isEditing } = runManager()
      handleEditPreset()

      await handlePresetSave({ title: 'My Preset', setAsDefault: false })

      expect(isEditing.value).toBe(false)
    })
  })

  describe('handlePresetSave() - create new preset', () => {
    it('calls send() without preset_id for new preset', async () => {
      enablePresets()
      const { handlePresetSave } = runManager()

      await handlePresetSave({ title: 'New Preset', setAsDefault: false })

      expect(mockSend).toHaveBeenCalledTimes(1)
      const sent = JSON.parse(mockSend.mock.calls[0]![0])
      expect(sent.data.preset_id).toBeUndefined()
    })
  })

  describe('pending save watcher - update case', () => {
    it('restores currentPresetId when presets update after save', async () => {
      enablePresets()
      const store = useCollectionsStore()
      store.setActivePreset(2)
      const { handleEditPreset, handlePresetSave } = runManager()
      handleEditPreset()
      await handlePresetSave({ title: 'Updated', setAsDefault: false })

      store.setPresets([makePreset({ id: 2, title: 'Updated' })])
      await nextTick()

      expect(store.currentPresetId).toBe(2)
    })

    it('does not change state when presets update without a pending save', async () => {
      const store = useCollectionsStore()
      runManager()

      store.setPresets([makePreset({ id: 1 })])
      await nextTick()

      expect(store.currentPresetId).toBeNull()
    })
  })

  describe('pending save watcher - create case', () => {
    it('switches to preset mode when new preset found by title', async () => {
      enablePresets()
      const store = useCollectionsStore()
      const { handlePresetSave } = runManager()
      await handlePresetSave({ title: 'Brand New', setAsDefault: false })

      store.setPresets([makePreset({ id: 99, title: 'Brand New' })])
      await nextTick()

      expect(store.currentPresetId).toBe(99)
    })

    it('does not resolve if preset with matching title is not in list', async () => {
      enablePresets()
      const store = useCollectionsStore()
      const { handlePresetSave } = runManager()
      await handlePresetSave({ title: 'Brand New', setAsDefault: false })

      store.setPresets([makePreset({ id: 99, title: 'Other Name' })])
      await nextTick()

      expect(store.currentPresetId).toBeNull()
    })
  })

  describe('auto-apply default watcher', () => {
    it('applies defaultPreset when presets load with a default and no currentPresetId', async () => {
      enablePresets()
      const store = useCollectionsStore()
      store.setPresets([makePreset({ id: 10, is_default: true })])

      runManager()
      await nextTick()

      expect(store.currentPresetId).toBe(10)
    })

    it('does not auto-apply if currentPresetId is already set', async () => {
      enablePresets()
      const store = useCollectionsStore()
      store.setPresets([makePreset({ id: 10, is_default: true })])
      store.setActivePreset(99)

      runManager()
      await nextTick()

      expect(store.currentPresetId).toBe(99)
    })

    it('does not auto-apply while a save is pending', async () => {
      enablePresets()
      const store = useCollectionsStore()
      store.setActivePreset(2)
      const { handleEditPreset, handlePresetSave } = runManager()
      handleEditPreset()
      await handlePresetSave({ title: 'Saving...', setAsDefault: false })

      store.setPresets([makePreset({ id: 10, is_default: true })])
      await nextTick()

      // Pending save (id=2) resolves first; auto-apply is skipped
      expect(store.currentPresetId).toBe(2)
    })
  })
})
