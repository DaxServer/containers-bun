import { parseCategoryNames } from '@/utils/categoryParsing'
import { ref } from 'vue'

export type QueryPage = { title: string; missing?: boolean }
export type QueryNormalized = { from: string; to: string }

const COMMONS_API_URL = 'https://commons.wikimedia.org/w/api.php'
const TITLES_PER_REQUEST = 50

export const useCategoryValidation = () => {
  const missingCategories = ref<string[]>([])
  const queriedCategories = new Set<string>()
  const existingCategories = new Set<string>()
  let abortController: AbortController | null = null

  const checkCategories = async (text: string): Promise<void> => {
    const categoryNames = parseCategoryNames(text)

    if (categoryNames.length === 0) {
      missingCategories.value = []
      return
    }

    const toQuery = categoryNames.filter((name) => !queriedCategories.has(name))

    if (toQuery.length > 0) {
      abortController?.abort()
      abortController = new AbortController()
      const { signal } = abortController

      try {
        for (let i = 0; i < toQuery.length; i += TITLES_PER_REQUEST) {
          if (signal.aborted) return

          const chunk = toQuery.slice(i, i + TITLES_PER_REQUEST)
          const params = new URLSearchParams()
          params.set('action', 'query')
          params.set('titles', chunk.map((name) => `Category:${name}`).join('|'))
          params.set('format', 'json')
          params.set('origin', '*')
          params.set('formatversion', '2')

          const res = await fetch(COMMONS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
            signal,
          })

          if (signal.aborted) return
          if (!res.ok) return

          const data = (await res.json()) as {
            query?: {
              normalized?: QueryNormalized[]
              pages?: QueryPage[]
            }
          }

          const normalizedToOriginal = new Map<string, string>()
          for (const { from, to } of data.query?.normalized ?? []) {
            normalizedToOriginal.set(to.replace(/^Category:/, ''), from.replace(/^Category:/, ''))
          }

          for (const page of data.query?.pages ?? []) {
            const normalizedName = page.title.replace(/^Category:/, '')
            const originalName = normalizedToOriginal.get(normalizedName) ?? normalizedName
            queriedCategories.add(originalName)
            if (!page.missing) {
              existingCategories.add(originalName)
            }
          }
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return
      }
    }

    missingCategories.value = categoryNames.filter((name) => !existingCategories.has(name))
  }

  return { missingCategories, checkCategories }
}
