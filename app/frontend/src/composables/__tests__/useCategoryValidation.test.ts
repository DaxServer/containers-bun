import { parseCategoryNames } from '@/utils/categoryParsing'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import type { QueryNormalized, QueryPage } from '../useCategoryValidation'

describe('useCategoryValidation', () => {
  let useCategoryValidation: typeof import('../useCategoryValidation').useCategoryValidation

  beforeEach(async () => {
    setActivePinia(createPinia())
    const mod = await import('../useCategoryValidation')
    useCategoryValidation = mod.useCategoryValidation
  })

  describe('parseCategoryNames', () => {
    it.each([
      ['empty string', ''],
      ['plain text', 'some plain text'],
      ['missing closing brackets', '[[Category:Foo'],
      ['single-bracket link', '[Category:Foo]'],
      ['two opening one closing bracket', '[[Category:Foo]'],
      ['one opening two closing brackets', '[Category:Foo]]'],
      ['whitespace-only name', '[[Category:   ]]'],
    ])('returns [] for %s', (_, input) => {
      expect(parseCategoryNames(input)).toEqual([])
    })

    it.each([
      ['standard wikitext', '[[Category:Photography in Berlin]]', 'Photography in Berlin'],
      ['lowercase Category prefix', '[[category:Foo]]', 'Foo'],
      [
        'lowercase first char in name',
        '[[Category:photography in Berlin]]',
        'Photography in Berlin',
      ],
      ['leading and trailing whitespace', '[[Category:  Foo  ]]', 'Foo'],
      ['pipe alias', '[[Category:Foo|display text]]', 'Foo'],
      ['trailing space before sort key', '[[Category:Foo |sort key]]', 'Foo'],
      ['underscores replaced with spaces', '[[Category:Foo_Bar_Baz]]', 'Foo Bar Baz'],
    ])('extracts name from %s', (_, input, expected) => {
      expect(parseCategoryNames(input)).toEqual([expected])
    })

    it.each([
      ['identical names', '[[Category:Foo]]\n[[Category:Foo]]', ['Foo']],
      ['names differing only by trailing space', '[[Category:Foo ]]\n[[Category:Foo]]', ['Foo']],
      [
        'names differing only by underscores vs spaces',
        '[[Category:Foo_Bar]]\n[[Category:Foo Bar]]',
        ['Foo Bar'],
      ],
    ])('deduplicates %s', (_, input, expected) => {
      expect(parseCategoryNames(input)).toEqual(expected)
    })

    it('extracts multiple category names', () => {
      expect(
        parseCategoryNames('[[Category:Photography in Berlin]]\n[[Category:2024 uploads]]'),
      ).toEqual(['Photography in Berlin', '2024 uploads'])
    })
  })

  const buildMockFetch = (pages: QueryPage[], normalized: QueryNormalized[] = []) =>
    mock(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            query: {
              ...(normalized.length > 0 ? { normalized } : {}),
              pages,
            },
          }),
      }),
    )

  describe('composable', () => {
    it('returns empty missingCategories for empty text', async () => {
      const { missingCategories, checkCategories } = useCategoryValidation()
      await checkCategories('')
      expect(missingCategories.value).toEqual([])
    })

    it('reports missing categories returned by the API', async () => {
      global.fetch = buildMockFetch([
        { title: 'Category:Photography in Berlin', missing: true },
      ]) as unknown as typeof fetch

      const { missingCategories, checkCategories } = useCategoryValidation()
      await checkCategories('[[Category:Photography in Berlin]]')
      expect(missingCategories.value).toEqual(['Photography in Berlin'])
    })

    it.each([
      {
        label: 'category exists on Commons',
        pages: [{ title: 'Category:Photography in Berlin' }] as QueryPage[],
        normalized: [] as QueryNormalized[],
        input: '[[Category:Photography in Berlin]]',
      },
      {
        label: 'category with underscores exists on Commons',
        pages: [{ title: 'Category:Photography in Berlin' }] as QueryPage[],
        normalized: [] as QueryNormalized[],
        input: '[[Category:Photography_in_Berlin]]',
      },
    ])('does not report category as missing when $label', async ({ pages, normalized, input }) => {
      global.fetch = buildMockFetch(pages, normalized) as unknown as typeof fetch

      const { missingCategories, checkCategories } = useCategoryValidation()
      await checkCategories(input)
      expect(missingCategories.value).toEqual([])
    })

    it.each([
      {
        label: 'confirmed to be missing',
        pages: [{ title: 'Category:Photography in Berlin', missing: true }] as QueryPage[],
        normalized: [] as QueryNormalized[],
        input: '[[Category:Photography in Berlin]]',
        expectedMissing: ['Photography in Berlin'] as string[],
      },
      {
        label: 'confirmed to exist',
        pages: [{ title: 'Category:Photography in Berlin' }] as QueryPage[],
        normalized: [] as QueryNormalized[],
        input: '[[Category:Photography in Berlin]]',
        expectedMissing: [] as string[],
      },
    ])(
      'does not re-query category $label',
      async ({ pages, normalized, input, expectedMissing }) => {
        const mockFetch = buildMockFetch(pages, normalized)
        global.fetch = mockFetch as unknown as typeof fetch

        const { missingCategories, checkCategories } = useCategoryValidation()
        await checkCategories(input)
        await checkCategories(`${input}\n`)

        expect(mockFetch.mock.calls).toHaveLength(1)
        expect(missingCategories.value).toEqual(expectedMissing)
      },
    )

    it('sends categories in batches of 50 when there are more than 50', async () => {
      const catNames = Array.from({ length: 51 }, (_, i) => `Cat${i + 1}`)
      const allPages = catNames.map((name) => ({ title: `Category:${name}` }))

      let callCount = 0
      global.fetch = mock(() => {
        const chunk = callCount === 0 ? allPages.slice(0, 50) : allPages.slice(50)
        callCount++
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              query: { pages: chunk },
            }),
        })
      }) as unknown as typeof fetch

      const { missingCategories, checkCategories } = useCategoryValidation()
      await checkCategories(catNames.map((name) => `[[Category:${name}]]`).join('\n'))

      expect((global.fetch as unknown as ReturnType<typeof mock>).mock.calls).toHaveLength(2)
      expect(missingCategories.value).toEqual([])
    })
  })
})
