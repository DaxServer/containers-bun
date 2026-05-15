import { useTitleVerification } from '@/composables/useTitleVerification'
import { useCollectionsStore } from '@/stores/collections.store'
import type { Image } from '@/types/image'
import { TITLE_STATUS } from '@/types/image'
import {
  OPTIONAL_FIELD_PATHS,
  applyTitleTemplate,
  extractUsedCameraFields,
  extractUsedOptionalFields,
  hasMissingCameraFields,
  hasMissingOptionalFields,
  validPaths,
  validateTemplate,
} from '@/utils/titleTemplate'
import { computed, ref, watch } from 'vue'

export const useTitleTemplate = () => {
  const store = useCollectionsStore()
  const { verifyTitles } = useTitleVerification()
  const internalTemplate = ref(
    store.globalTitleTemplate ||
      'Mapillary ({{mapillary.photo.id}}, {{mapillary.photo.sequence}}) ({{mapillary.user.username}}) {{captured.date}} {{captured.time_ms}}.jpg',
  )
  const error = ref<string | null>(null)

  const applyTemplate = async () => {
    const { valid, error: err } = validateTemplate(internalTemplate.value)
    if (!valid) {
      error.value = err
      return
    }
    store.globalTitleTemplate = internalTemplate.value
    await verifyTitlesWithTemplate()
  }

  const verifyTitlesWithTemplate = async () => {
    // Use the store's template, not internalTemplate, so this works from any context
    const templateToUse = store.globalTitleTemplate
    const usedOptFields = extractUsedOptionalFields(templateToUse)

    const itemsToVerify: { id: string; title: string; image: Image }[] = []
    store.selectedItems.forEach((item) => {
      const itemMeta = store.items[item.id]?.meta
      if (!itemMeta?.title || itemMeta?.titleStatus === TITLE_STATUS.MissingFields) {
        const missing = usedOptFields.filter((p) => hasMissingOptionalFields(item.image, [p]))
        if (missing.length > 0) {
          const title = applyTitleTemplate(templateToUse, item.image, store.input)
          store.updateItem(item.id, 'titleStatus', TITLE_STATUS.MissingFields)
          store.updateItem(item.id, 'missingFields', missing)
          store.updateItem(item.id, 'title', title)
          return
        }

        store.updateItem(item.id, 'missingFields', [])
        // Clear a title that was written during a prior MissingFields state so
        // getEffectiveTitle falls back to the template rather than returning the stale partial value
        if (itemMeta?.titleStatus === TITLE_STATUS.MissingFields) {
          store.updateItem(item.id, 'title', '')
        }
        itemsToVerify.push({
          id: item.id,
          title: applyTitleTemplate(templateToUse, item.image, store.input),
          image: item.image,
        })
      }
    })

    if (itemsToVerify.length > 0) {
      await verifyTitles(itemsToVerify)
    }
  }

  const template = computed({
    get: () => internalTemplate.value,
    set: (newVal: string) => {
      internalTemplate.value = newVal
      const { error: err } = validateTemplate(newVal)
      error.value = err
    },
  })

  // Sync internalTemplate when store's globalTitleTemplate changes externally (e.g., from preset)
  // In editing mode the user controls internalTemplate; all other modes always sync from store
  watch(
    () => store.globalTitleTemplate,
    (newVal) => {
      if (!store.isEditingPreset) {
        internalTemplate.value = newVal
        const { error: err } = validateTemplate(newVal)
        error.value = err
      }
    },
  )

  const insertVariable = (variable: string) => {
    const prefix = template.value.length > 0 && !template.value.endsWith(' ') ? ' ' : ''
    template.value += `${prefix}{{${variable}}}`
  }

  const isDirty = computed(() => internalTemplate.value !== store.globalTitleTemplate)
  const usedCameraFields = computed(() => extractUsedCameraFields(internalTemplate.value))
  const anyItemsMissingCameraFields = computed(() =>
    store.selectedItems.some((item) =>
      hasMissingCameraFields(item.image, ['camera.make', 'camera.model']),
    ),
  )
  const itemsMissingCameraFields = computed(() => {
    const usedFields = usedCameraFields.value
    if (usedFields.length === 0) return []

    return store.selectedItems.filter((item) => hasMissingCameraFields(item.image, usedFields))
  })

  const usedOptionalFields = computed(() => extractUsedOptionalFields(internalTemplate.value))
  const itemsMissingOptionalFields = computed(() => {
    const usedFields = usedOptionalFields.value
    if (usedFields.length === 0) return []

    return store.selectedItems.filter((item) => hasMissingOptionalFields(item.image, usedFields))
  })

  // Which optional field paths have at least one selected item missing them (independent of template)
  const allMissingOptionalFieldPaths = computed(() => {
    const missing = new Set<string>()
    store.selectedItems.forEach((item) => {
      for (const path of OPTIONAL_FIELD_PATHS) {
        if (hasMissingOptionalFields(item.image, [path])) {
          missing.add(path)
        }
      }
    })
    return missing
  })

  const highlightedTemplate = computed(() => {
    if (!template.value) return ' '
    const text = template.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    return (
      text.replace(
        /(\{\{[^{}]*\}\})|(\{\{)|(\}\})/g,
        (match, completeTag, openBrace, closeBrace) => {
          if (completeTag) {
            const content = match.slice(2, -2).trim()
            const isValid = validPaths.includes(content)
            const isOptionalField = (OPTIONAL_FIELD_PATHS as readonly string[]).includes(content)
            const hasMissingItems =
              isOptionalField && allMissingOptionalFieldPaths.value.has(content)

            let classes: string
            if (hasMissingItems && isValid) {
              // Yellow/orange warn color for optional fields with missing values
              classes = 'text-yellow-600 bg-yellow-50 border border-yellow-400'
            } else if (isValid) {
              classes = 'text-blue-600 bg-blue-50'
            } else {
              classes = 'text-red-600 bg-red-50 border-b-2 border-red-600'
            }
            return `<span class="${classes} rounded-sm">${match}</span>`
          }
          if (openBrace || closeBrace) {
            return `<span class="text-red-600 bg-red-50 border-b-2 border-red-600 rounded-sm">${match}</span>`
          }
          return match
        },
      ) + (text.endsWith('\n') ? '<br>' : '')
    )
  })

  const previewItems = computed(() => {
    return store.selectedItems.slice(0, 3).map((item) => ({
      id: item.id,
      index: item.index,
      title: applyTitleTemplate(template.value, item.image, store.input),
    }))
  })

  const getVariableToken = (path: string) => `{{${path}}}`

  return {
    error,
    highlightedTemplate,
    isDirty,
    anyItemsMissingCameraFields,
    itemsMissingCameraFields,
    allMissingOptionalFieldPaths,
    itemsMissingOptionalFields,
    previewItems,
    template,
    usedCameraFields,
    usedOptionalFields,

    applyTemplate,
    verifyTitlesWithTemplate,
    getVariableToken,
    insertVariable,
  }
}
