import { useCategoryValidation } from '@/composables/useCategoryValidation'
import { useTitleTemplate } from '@/composables/useTitleTemplate'
import { useCollectionsStore } from '@/stores/collections.store'
import {
  OPTIONAL_FIELD_PATHS,
  applyFieldTemplate,
  hasMissingOptionalFields,
  validPaths,
} from '@/utils/titleTemplate'
import { debounce } from 'ts-debounce'
import { computed, onScopeDispose, ref, watch } from 'vue'

const APPLY_DEBOUNCE_MS = 500
const STATUS_CLEAR_MS = 2000

type FieldStatus = 'applying' | 'applied' | null

export const useTemplateEditor = (
  categoryValidation: ReturnType<typeof useCategoryValidation> = useCategoryValidation(),
) => {
  const store = useCollectionsStore()
  const titleTemplate = useTitleTemplate()
  const { missingCategories, checkCategories } = categoryValidation

  const internalDescription = ref(store.globalDescription)
  const internalCategories = ref(store.globalCategories)

  watch(
    () => store.globalDescription,
    (val) => {
      if (!store.isEditingPreset) internalDescription.value = val
    },
  )

  watch(
    () => store.globalCategories,
    (val) => {
      if (!store.isEditingPreset) internalCategories.value = val
    },
  )

  const descriptionIsDirty = computed(() => internalDescription.value !== store.globalDescription)
  const categoriesIsDirty = computed(() => internalCategories.value !== store.globalCategories)

  const highlightField = (text: string): string => {
    if (!text) return ' '
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return (
      escaped.replace(/(\{\{[^{}]*\}\})/g, (match) => {
        const content = match.slice(2, -2).trim()
        if (!validPaths.includes(content)) return match
        const isOptional = (OPTIONAL_FIELD_PATHS as readonly string[]).includes(content)
        const hasMissing =
          isOptional &&
          store.selectedItems.some((item) => hasMissingOptionalFields(item.image, [content]))
        const classes = hasMissing
          ? 'text-yellow-600 bg-yellow-50 border border-yellow-400'
          : 'text-blue-600 bg-blue-50'
        return `<span class="${classes} rounded-sm">${match}</span>`
      }) + (escaped.endsWith('\n') ? '<br>' : '')
    )
  }

  const descriptionHighlighted = computed(() => highlightField(internalDescription.value))
  const categoriesHighlighted = computed(() => highlightField(internalCategories.value))

  const allMissingOptionalFieldPaths = computed(() => {
    const missing = new Set<string>()
    const templates = [
      titleTemplate.template.value,
      internalDescription.value,
      internalCategories.value,
    ]
    store.selectedItems.forEach((item) => {
      for (const path of OPTIONAL_FIELD_PATHS) {
        if (templates.some((t) => t.includes(`{{${path}}}`))) {
          if (hasMissingOptionalFields(item.image, [path])) {
            missing.add(path)
          }
        }
      }
    })
    return missing
  })

  const previewItems = computed(() =>
    store.selectedItems.slice(0, 3).map((item) => ({
      id: item.id,
      index: item.index,
      title: titleTemplate.previewItems.value.find((p) => p.id === item.id)?.title ?? '',
      description: applyFieldTemplate(internalDescription.value, item.image, store.input),
      categories: applyFieldTemplate(internalCategories.value, item.image, store.input),
    })),
  )

  const onDragStart = (event: DragEvent, variable: string) => {
    if (!event.dataTransfer) return
    const text = `{{${variable}}}`
    event.dataTransfer.setData('text/plain', text)
    event.dataTransfer.effectAllowed = 'copy'
    const el = document.createElement('div')
    el.textContent = text
    el.className =
      'absolute top-[-9999px] bg-white p-1 rounded text-sm border border-gray-200 z-50 pointer-events-none'
    document.body.appendChild(el)
    event.dataTransfer.setDragImage(el, 0, -10)
    requestAnimationFrame(() => document.body.removeChild(el))
  }

  const titleStatus = ref<FieldStatus>(null)
  const descriptionStatus = ref<FieldStatus>(null)
  const categoriesStatus = ref<FieldStatus>(null)

  let titleClearTimer: ReturnType<typeof setTimeout> | undefined
  let descriptionClearTimer: ReturnType<typeof setTimeout> | undefined
  let categoriesClearTimer: ReturnType<typeof setTimeout> | undefined

  const applyTitle = debounce(async () => {
    if (!titleTemplate.isDirty.value) return
    titleStatus.value = 'applying'
    await titleTemplate.applyTemplate()
    titleStatus.value = 'applied'
    clearTimeout(titleClearTimer)
    titleClearTimer = setTimeout(() => {
      titleStatus.value = null
    }, STATUS_CLEAR_MS)
  }, APPLY_DEBOUNCE_MS)

  const applyDescription = debounce(() => {
    if (!descriptionIsDirty.value) return
    descriptionStatus.value = 'applying'
    store.setGlobalDescription(internalDescription.value)
    descriptionStatus.value = 'applied'
    clearTimeout(descriptionClearTimer)
    descriptionClearTimer = setTimeout(() => {
      descriptionStatus.value = null
    }, STATUS_CLEAR_MS)
  }, APPLY_DEBOUNCE_MS)

  const applyCategories = debounce(async () => {
    categoriesStatus.value = 'applying'
    if (categoriesIsDirty.value) {
      store.setGlobalCategories(internalCategories.value)
    }
    const resolvedCategories = store.selectedItems
      .map((item) => applyFieldTemplate(internalCategories.value, item.image, store.input))
      .join('\n')
    await checkCategories(resolvedCategories)
    categoriesStatus.value = 'applied'
    clearTimeout(categoriesClearTimer)
    categoriesClearTimer = setTimeout(() => {
      categoriesStatus.value = null
    }, STATUS_CLEAR_MS)
  }, APPLY_DEBOUNCE_MS)

  watch(titleTemplate.template, () => {
    titleStatus.value = null
    clearTimeout(titleClearTimer)
    applyTitle()
  })

  watch(internalDescription, () => {
    descriptionStatus.value = null
    clearTimeout(descriptionClearTimer)
    applyDescription()
  })

  watch(internalCategories, () => {
    categoriesStatus.value = null
    clearTimeout(categoriesClearTimer)
    applyCategories()
  })

  onScopeDispose(() => {
    applyTitle.cancel()
    applyDescription.cancel()
    applyCategories.cancel()
    clearTimeout(titleClearTimer)
    clearTimeout(descriptionClearTimer)
    clearTimeout(categoriesClearTimer)
  })

  return {
    internalDescription,
    internalCategories,
    descriptionIsDirty,
    categoriesIsDirty,
    descriptionHighlighted,
    categoriesHighlighted,
    allMissingOptionalFieldPaths,
    previewItems,
    onDragStart,
    titleStatus,
    descriptionStatus,
    categoriesStatus,
    missingCategories,
    titleTemplate,
  }
}
