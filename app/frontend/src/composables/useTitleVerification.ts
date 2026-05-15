import { useTitleBlacklist } from '@/composables/useTitleBlacklist'
import { useCollectionsStore } from '@/stores/collections.store'
import type { Image, TitleStatus } from '@/types/image'
import { TITLE_STATUS } from '@/types/image'
import { applyTitleTemplate, isValidExtension } from '@/utils/titleTemplate'
import { debounce } from 'ts-debounce'

let titleVerificationAbortController: AbortController | null = null
const debouncedCheckTitleMap = new Map<string, ReturnType<typeof debounce>>()

const getTitleVerificationAbortController = (): AbortController => {
  if (
    titleVerificationAbortController === null ||
    titleVerificationAbortController.signal.aborted
  ) {
    titleVerificationAbortController = new AbortController()
  }
  return titleVerificationAbortController
}

export const useTitleVerification = () => {
  const store = useCollectionsStore()
  const { isBlacklisted } = useTitleBlacklist()

  const buildTitle = (image: Image): string => {
    const date = image.dates.taken.toISOString().split('T')[0]!
    return `Photo from Mapillary ${date} (${image.id}).jpg`
  }

  const getTemplateTitle = (image: Image): string => {
    const template = store.globalTitleTemplate.trim()
    if (!template) return buildTitle(image)

    const computed = applyTitleTemplate(template, image, store.input).trim()
    if (!computed) return buildTitle(image)

    return computed
  }

  const getEffectiveTitle = (item: Item): string => {
    const explicit = item.meta.title?.trim()
    if (explicit) return explicit

    return getTemplateTitle(item.image)
  }

  const findDuplicateTitles = (): Set<string> => {
    const titleCount = new Map<string, number>()
    for (const item of store.selectedItems) {
      const title = getEffectiveTitle(item)
      titleCount.set(title, (titleCount.get(title) || 0) + 1)
    }
    const duplicates = new Set<string>()
    for (const [title, count] of titleCount.entries()) {
      if (count > 1) duplicates.add(title)
    }
    return duplicates
  }

  const validateTitle = (
    item: { id: string; title: string; image: Image },
    duplicateTitles: Set<string>,
  ): TitleStatus | null => {
    if (!isValidExtension(item.title)) return TITLE_STATUS.Invalid
    if (isBlacklisted(item.title)) return TITLE_STATUS.Blacklisted

    const effectiveTitle = item.title || getTemplateTitle(item.image)
    if (effectiveTitle && duplicateTitles.has(effectiveTitle)) return TITLE_STATUS.Duplicate

    return null
  }

  const checkFileTitleAvailability = async (
    items: { id: string; title: string }[],
  ): Promise<void> => {
    const signal = getTitleVerificationAbortController().signal
    const chunkSize = 50

    for (let i = 0; i < items.length; i += chunkSize) {
      if (signal.aborted) return

      const chunk = items.slice(i, i + chunkSize)
      const fileTitles = chunk.map((item) => `File:${item.title}`)
      const params = new URLSearchParams()
      params.set('action', 'query')
      params.set('prop', 'revisions')
      params.set('titles', fileTitles.join('|'))
      params.set('format', 'json')
      params.set('origin', '*')
      params.set('formatversion', '2')

      let res: Response | null = null
      try {
        res = await fetch('https://commons.wikimedia.org/w/api.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
          signal,
        })
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return
        continue
      }

      if (signal.aborted) return
      if (!res?.ok) continue
      const data = (await res.json()) as {
        query?: {
          normalized?: Array<{ from: string; to: string }>
          pages?: Record<string, { missing?: boolean; title: string; revisions?: unknown[] }>
        }
      }

      // Build page lookup map for O(1) access
      const pages = Object.values(data.query?.pages || {})
      const pageByTitle = new Map(pages.map((p) => [p.title, p]))

      // Build mapping from original title to normalized title
      const originalToNormalized = new Map<string, string>()
      for (const n of data.query?.normalized || []) {
        originalToNormalized.set(n.from, n.to)
      }

      for (const item of chunk) {
        if (signal.aborted) return

        // Check both original title and normalized title using O(1) map lookups
        const originalTitle = `File:${item.title}`
        const normalizedTitle = originalToNormalized.get(originalTitle)
        const page =
          pageByTitle.get(originalTitle) ??
          (normalizedTitle ? pageByTitle.get(normalizedTitle) : undefined)

        let status: TitleStatus = TITLE_STATUS.Unknown

        if (!page) {
          status = TITLE_STATUS.Unknown
        } else if (page.missing) {
          status = TITLE_STATUS.Available
        } else if (page.revisions) {
          status = TITLE_STATUS.Taken
        }

        store.updateItem(item.id, 'titleStatus', status)
      }
    }
  }

  const verifyTitles = async (
    items: { id: string; title: string; image: Image }[],
    options: { debounce?: boolean } = {},
  ): Promise<void> => {
    const duplicateTitles = findDuplicateTitles()

    if (options.debounce) {
      for (const item of items) {
        const error = validateTitle(item, duplicateTitles)
        if (error) {
          store.updateItem(item.id, 'titleStatus', error)
          continue
        }

        store.updateItem(item.id, 'titleStatus', TITLE_STATUS.Checking)
        if (!debouncedCheckTitleMap.has(item.id)) {
          const debouncedFn = debounce(async (id: string, title: string) => {
            await checkFileTitleAvailability([{ id, title }])
          }, 100)
          debouncedCheckTitleMap.set(item.id, debouncedFn)
        }
        debouncedCheckTitleMap.get(item.id)!(item.id, item.title)
      }
      return
    }

    const validItems: { id: string; title: string }[] = []

    for (const item of items) {
      const error = validateTitle(item, duplicateTitles)
      if (error) {
        store.updateItem(item.id, 'titleStatus', error)
        continue
      }

      store.updateItem(item.id, 'titleStatus', TITLE_STATUS.Checking)
      validItems.push({ id: item.id, title: item.title })
    }

    if (validItems.length > 0) {
      await checkFileTitleAvailability(validItems)
    }
  }

  const cancelTitleVerification = (): void => {
    titleVerificationAbortController?.abort()
    titleVerificationAbortController = null

    for (const debounced of debouncedCheckTitleMap.values()) {
      debounced.cancel()
    }
    debouncedCheckTitleMap.clear()

    for (const item of Object.values(store.items)) {
      if (item.meta.titleStatus === TITLE_STATUS.Checking) {
        store.updateItem(item.id, 'titleStatus', TITLE_STATUS.Unknown)
      }
    }
  }

  return {
    buildTitle,
    cancelTitleVerification,
    findDuplicateTitles,
    getEffectiveTitle,
    getTemplateTitle,
    validateTitle,
    verifyTitles,
  }
}
