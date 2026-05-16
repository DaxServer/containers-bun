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
    await client.uploadFile('test.jpg', 'https://cdn.example/test.jpg', 'wikitext', 'summary', redis, 1, 1)

    const allCalls = setMock.mock.calls as unknown as unknown[][]
    const lockSetCall = allCalls.find((args) => String(args[0]).startsWith('hashlock:'))

    expect(lockSetCall).toBeDefined()
    expect(lockSetCall?.[2]).toBe('EX')
    expect(lockSetCall?.[3]).toBe(600)
    expect(lockSetCall?.[4]).toBe('NX')
  })
})
