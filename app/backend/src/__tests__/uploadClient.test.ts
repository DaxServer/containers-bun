import { MediaWikiClient } from '@backend/mediawiki/client'
import { describe, expect, it, mock } from 'bun:test'
import type { Redis } from 'ioredis'

function makeRedisMock() {
  return {
    get: mock(async () => null),
    set: mock(async () => 'OK' as const),
    del: mock(async () => 1),
  } as unknown as Redis & {
    set: ReturnType<typeof mock>
    del: ReturnType<typeof mock>
  }
}

describe('MediaWikiClient.uploadFile hash lock TTL', () => {
  it('acquires hash lock with a 600-second TTL', async () => {
    const client = new MediaWikiClient(['key', 'secret'])

    // Stub private/public methods to avoid real network calls
    ;(client as any).getCsrfToken = mock(async () => 'test-token+\\')
    client.findDuplicates = mock(async () => [])
    ;(client as any).apiUploadChunk = mock(async () => ({
      upload: {
        filekey: 'stash-key',
        result: 'Success',
        imageinfo: { url: 'https://commons.wikimedia.org/test.jpg' },
      },
    }))

    globalThis.fetch = mock(async () => new Response(Buffer.from('tiny-file'), { status: 200 })) as any

    const redis = makeRedisMock()
    await client.uploadFile('test.jpg', 'https://cdn.example/test.jpg', 'wikitext', 'summary', redis, 1, 1)

    const lockSetCall = (redis.set as ReturnType<typeof mock>).mock.calls.find(
      (args: unknown[]) => String(args[0]).startsWith('hashlock:'),
    ) as unknown[] | undefined

    expect(lockSetCall).toBeDefined()
    expect(lockSetCall?.[2]).toBe('EX')
    expect(lockSetCall?.[3]).toBe(600)
    expect(lockSetCall?.[4]).toBe('NX')
  })
})
