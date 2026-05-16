import { DuplicateUploadError, HashLockError, SourceCdnError } from '@backend/core/errors'
import { MediaWikiClient } from '@backend/mediawiki/client'
import { describe, expect, it, mock } from 'bun:test'
import type { Redis } from 'ioredis'

function makeRedisMock() {
  const setMock = mock(async () => 'OK' as const)
  const delMock = mock(async () => 1)
  const getMock = mock(async () => null)
  const redis = { get: getMock, set: setMock, del: delMock } as unknown as Redis
  return { redis, setMock, delMock }
}

function mockFetch(body: unknown, status = 200) {
  globalThis.fetch = mock(
    async () => new Response(JSON.stringify(body), { status }),
  ) as unknown as typeof fetch
}

function mockFetchSequence(responses: { body: unknown; status?: number }[]) {
  let call = 0
  globalThis.fetch = mock(async () => {
    const r = responses[call] ?? responses[responses.length - 1]!
    call++
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 })
  }) as unknown as typeof fetch
}

describe('MediaWikiClient.uploadFile hash lock TTL', () => {
  it('acquires hash lock with a 600-second TTL', async () => {
    const client = new MediaWikiClient(['key', 'secret'])

    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).getCsrfToken = mock(async () => 'test-token+\\')
    client.findDuplicates = mock(async () => [])
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).apiUploadChunk = mock(async () => ({
      upload: {
        filekey: 'stash-key',
        result: 'Success',
        imageinfo: { url: 'https://commons.wikimedia.org/test.jpg' },
      },
    }))

    globalThis.fetch = mock(
      async () => new Response(Buffer.from('tiny-file'), { status: 200 }),
    ) as unknown as typeof fetch

    const { redis, setMock } = makeRedisMock()
    await client.uploadFile(
      'test.jpg',
      'https://cdn.example/test.jpg',
      'wikitext',
      'summary',
      redis,
      1,
      1,
    )

    const allCalls = setMock.mock.calls as unknown as unknown[][]
    const lockSetCall = allCalls.find((args) => String(args[0]).startsWith('hashlock:'))

    expect(lockSetCall).toBeDefined()
    expect(lockSetCall?.[2]).toBe('EX')
    expect(lockSetCall?.[3]).toBe(600)
    expect(lockSetCall?.[4]).toBe('NX')
  })
})

describe('MediaWikiClient.uploadFile error paths', () => {
  it('throws SourceCdnError when source URL returns 5xx', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    mockFetch({}, 503)
    const { redis } = makeRedisMock()
    await expect(
      client.uploadFile(
        'test.jpg',
        'https://cdn.example/test.jpg',
        'wikitext',
        'summary',
        redis,
        1,
        1,
      ),
    ).rejects.toBeInstanceOf(SourceCdnError)
  })

  it('throws DuplicateUploadError when SHA1 duplicate exists', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    client.findDuplicates = mock(async () => [
      { title: 'File:existing.jpg', url: 'https://commons.example/existing.jpg' },
    ])
    globalThis.fetch = mock(
      async () => new Response(Buffer.from('data'), { status: 200 }),
    ) as unknown as typeof fetch
    const { redis } = makeRedisMock()
    await expect(
      client.uploadFile(
        'test.jpg',
        'https://cdn.example/test.jpg',
        'wikitext',
        'summary',
        redis,
        1,
        1,
      ),
    ).rejects.toBeInstanceOf(DuplicateUploadError)
  })

  it('throws HashLockError when lock is already held', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    client.findDuplicates = mock(async () => [])
    globalThis.fetch = mock(
      async () => new Response(Buffer.from('data'), { status: 200 }),
    ) as unknown as typeof fetch
    const setMock = mock(async () => null) // null = lock already held
    const redis = {
      get: mock(async () => null),
      set: setMock,
      del: mock(async () => 1),
    } as unknown as Redis
    await expect(
      client.uploadFile(
        'test.jpg',
        'https://cdn.example/test.jpg',
        'wikitext',
        'summary',
        redis,
        1,
        1,
      ),
    ).rejects.toBeInstanceOf(HashLockError)
  })
})

describe('MediaWikiClient.isCategoryDeleted', () => {
  it('returns true when logevents are present', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    mockFetch({ query: { logevents: [{ type: 'delete' }] } })
    expect(await client.isCategoryDeleted('Trees')).toBe(true)
  })

  it('returns false when no logevents', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    mockFetch({ query: { logevents: [] } })
    expect(await client.isCategoryDeleted('Trees')).toBe(false)
  })
})

describe('MediaWikiClient.checkTitleBlacklisted', () => {
  it('returns blacklisted=true with reason when title is blacklisted', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    mockFetch({ titleblacklist: { result: 'blacklisted', reason: 'Contains banned word' } })
    const result = await client.checkTitleBlacklisted('Bad Title.jpg')
    expect(result.blacklisted).toBe(true)
    expect(result.reason).toBe('Contains banned word')
  })

  it('returns blacklisted=false when title is allowed', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    mockFetch({ titleblacklist: { result: 'ok' } })
    const result = await client.checkTitleBlacklisted('Nice Photo.jpg')
    expect(result.blacklisted).toBe(false)
    expect(result.reason).toBe('')
  })
})

describe('MediaWikiClient.findDuplicates', () => {
  it('returns empty array when no duplicates', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    mockFetch({ query: { allimages: [] } })
    expect(await client.findDuplicates('abc123')).toEqual([])
  })

  it('returns duplicate titles and urls', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    mockFetch({
      query: { allimages: [{ title: 'File:Dup.jpg', url: 'https://commons.example/Dup.jpg' }] },
    })
    const dupes = await client.findDuplicates('abc123')
    expect(dupes).toHaveLength(1)
    expect(dupes[0]!.title).toBe('File:Dup.jpg')
    expect(dupes[0]!.url).toBe('https://commons.example/Dup.jpg')
  })
})

describe('MediaWikiClient.getUserRateLimits', () => {
  it('returns ratelimits and rights from userinfo', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    mockFetch({
      query: {
        userinfo: {
          ratelimits: { upload: { user: { hits: 8, seconds: 60 } } },
          rights: ['upload', 'edit'],
        },
      },
    })
    const result = await client.getUserRateLimits()
    expect(result.rights).toContain('upload')
    expect(result.ratelimits.upload?.user?.hits).toBe(8)
  })

  it('returns empty ratelimits and rights when absent', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    mockFetch({ query: { userinfo: {} } })
    const result = await client.getUserRateLimits()
    expect(result.ratelimits).toEqual({})
    expect(result.rights).toEqual([])
  })
})

describe('MediaWikiClient.createPage', () => {
  it('returns title on successful page creation', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).getCsrfToken = mock(async () => 'token+\\')
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).apiRequest = mock(async (params: Record<string, string>) => {
      if (params.action === 'edit') return { edit: { title: 'Category:Trees' } }
      return {}
    })
    const title = await client.createPage('Category:Trees', '[[Category:Nature]]')
    expect(title).toBe('Category:Trees')
  })

  it('returns title without error when articleexists', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).getCsrfToken = mock(async () => 'token+\\')
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).apiRequest = mock(async (params: Record<string, string>) => {
      if (params.action === 'edit')
        return { error: { code: 'articleexists', info: 'Article already exists' } }
      return {}
    })
    const title = await client.createPage('Category:Trees', 'text')
    expect(title).toBe('Category:Trees')
  })

  it('throws on other edit errors', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).getCsrfToken = mock(async () => 'token+\\')
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).apiRequest = mock(async (params: Record<string, string>) => {
      if (params.action === 'edit')
        return { error: { code: 'permissiondenied', info: 'You do not have permission' } }
      return {}
    })
    await expect(client.createPage('Category:Trees', 'text')).rejects.toThrow(
      'You do not have permission',
    )
  })
})

describe('MediaWikiClient.getCategoryMembers', () => {
  it('returns all member titles in a single page', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    mockFetch({
      query: {
        categorymembers: [{ title: 'File:A.jpg' }, { title: 'File:B.jpg' }],
      },
    })
    const members = await client.getCategoryMembers('Trees')
    expect(members).toEqual(['File:A.jpg', 'File:B.jpg'])
  })

  it('paginates using cmcontinue until no continue key', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    mockFetchSequence([
      {
        body: {
          query: { categorymembers: [{ title: 'File:A.jpg' }] },
          continue: { cmcontinue: 'page2token' },
        },
      },
      {
        body: {
          query: { categorymembers: [{ title: 'File:B.jpg' }] },
        },
      },
    ])
    const members = await client.getCategoryMembers('Trees')
    expect(members).toEqual(['File:A.jpg', 'File:B.jpg'])
  })
})

describe('MediaWikiClient.applySdc', () => {
  it('calls wbeditentity without throwing on success', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).getCsrfToken = mock(async () => 'token+\\')
    const apiRequestMock = mock(async () => ({}))
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).apiRequest = apiRequestMock
    await client.applySdc('Photo.jpg', [{ mainsnak: {} }], null, 'summary')
    expect(apiRequestMock).toHaveBeenCalled()
  })

  it('throws when wbeditentity returns an error', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).getCsrfToken = mock(async () => 'token+\\')
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).apiRequest = mock(async () => ({ error: { info: 'SDC error' } }))
    await expect(client.applySdc('Photo.jpg', null, null, 'summary')).rejects.toThrow('SDC error')
  })
})

describe('MediaWikiClient.replaceCategoryInPage', () => {
  it('replaces category and returns true on success', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).getCsrfToken = mock(async () => 'token+\\')
    const apiRequestMock = mock(async (params: Record<string, string>) => {
      if (params.action === 'query') {
        return {
          query: {
            pages: {
              '1': {
                revisions: [{ slots: { main: { content: '[[Category:Old Trees]]' } } }],
              },
            },
          },
        }
      }
      return {}
    })
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).apiRequest = apiRequestMock
    const result = await client.replaceCategoryInPage('File:A.jpg', 'Old Trees', 'New Trees')
    expect(result).toBe(true)
    expect(apiRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'edit' }),
      'POST',
      expect.objectContaining({ text: '[[Category:New Trees]]' }),
    )
  })

  it('returns false when category not found in wikitext', async () => {
    const client = new MediaWikiClient(['key', 'secret'])
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).getCsrfToken = mock(async () => 'token+\\')
    // biome-ignore lint/suspicious/noExplicitAny: overriding private methods for testing
    ;(client as any).apiRequest = mock(async (params: Record<string, string>) => {
      if (params.action === 'query') {
        return {
          query: {
            pages: {
              '1': { revisions: [{ slots: { main: { content: '[[Category:Unrelated]]' } } }] },
            },
          },
        }
      }
      return {}
    })
    const result = await client.replaceCategoryInPage('File:A.jpg', 'Old Trees', 'New Trees')
    expect(result).toBe(false)
  })
})
