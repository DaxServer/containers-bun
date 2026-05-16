import { buildParamString, createOAuthClient, percentEncode, sign } from '@backend/core/oauthClient'
import { describe, expect, it, mock } from 'bun:test'
import { createHmac } from 'node:crypto'

const CONSUMER_KEY = 'test_consumer_key'
const CONSUMER_SECRET = 'test_consumer_secret'

function signedJwt(payload: object, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const data = `${header}.${body}`
  const sig = createHmac('sha256', secret).update(data).digest().toString('base64url')
  return `${data}.${sig}`
}

describe('percentEncode', () => {
  it('leaves unreserved characters unchanged', () => {
    expect(percentEncode('abc123-._~')).toBe('abc123-._~')
  })

  it('encodes spaces as %20', () => {
    expect(percentEncode('hello world')).toBe('hello%20world')
  })

  it('encodes RFC 3986 reserved chars that encodeURIComponent misses', () => {
    expect(percentEncode('!')).toBe('%21')
    expect(percentEncode("'")).toBe('%27')
    expect(percentEncode('(')).toBe('%28')
    expect(percentEncode(')')).toBe('%29')
    expect(percentEncode('*')).toBe('%2A')
  })

  it('encodes = and & used in query strings', () => {
    expect(percentEncode('a=b&c=d')).toBe('a%3Db%26c%3Dd')
  })
})

describe('buildParamString', () => {
  it('sorts parameters alphabetically by key', () => {
    expect(buildParamString({ z: '1', a: '2', m: '3' })).toBe('a=2&m=3&z=1')
  })

  it('percent-encodes keys and values', () => {
    expect(buildParamString({ 'oauth token': 'val ue' })).toBe('oauth%20token=val%20ue')
  })

  it('produces empty string for empty params', () => {
    expect(buildParamString({})).toBe('')
  })
})

describe('sign', () => {
  it('produces HMAC-SHA1 base64 matching node:crypto reference', () => {
    const base = 'POST&https%3A%2F%2Fexample.com%2Fpath&a%3D1'
    const key = 'consumer_secret&token_secret'
    const expected = createHmac('sha1', key).update(base).digest('base64')
    expect(sign(base, key)).toBe(expected)
  })
})

describe('oauthClient.initiate', () => {
  it('returns redirectUrl and requestToken from Wikimedia response', async () => {
    const mockFetch = mock(
      async () =>
        new Response(
          'oauth_token=req_key&oauth_token_secret=req_secret&oauth_callback_confirmed=true',
        ),
    )
    const client = createOAuthClient(
      CONSUMER_KEY,
      CONSUMER_SECRET,
      mockFetch as unknown as typeof fetch,
    )

    const result = await client.initiate()

    expect(result.requestToken).toEqual(['req_key', 'req_secret'])
    expect(result.redirectUrl).toContain('oauth_token=req_key')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe('oauthClient.complete', () => {
  it('returns accessToken from Wikimedia token exchange', async () => {
    const mockFetch = mock(
      async () => new Response('oauth_token=acc_key&oauth_token_secret=acc_secret'),
    )
    const client = createOAuthClient(
      CONSUMER_KEY,
      CONSUMER_SECRET,
      mockFetch as unknown as typeof fetch,
    )

    const result = await client.complete(
      ['req_key', 'req_secret'],
      'oauth_token=req_key&oauth_verifier=verifier123',
    )

    expect(result.accessToken).toEqual(['acc_key', 'acc_secret'])
  })
})

describe('oauthClient.identify', () => {
  it('decodes the JWT payload from Wikimedia identify endpoint', async () => {
    const payload = {
      username: 'Alice',
      sub: 42,
      editcount: 200,
      rights: ['read', 'autoconfirmed'],
    }
    const mockFetch = mock(async () => new Response(signedJwt(payload, CONSUMER_SECRET)))
    const client = createOAuthClient(
      CONSUMER_KEY,
      CONSUMER_SECRET,
      mockFetch as unknown as typeof fetch,
    )

    const identity = await client.identify(['acc_key', 'acc_secret'])

    expect(identity.username).toBe('Alice')
    expect(identity.sub).toBe('42')
    expect(identity.editcount).toBe(200)
    expect(identity.rights).toContain('autoconfirmed')
  })
})
