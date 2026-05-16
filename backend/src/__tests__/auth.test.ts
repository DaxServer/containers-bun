import type { OAuthClient } from '@backend/core/oauthClient'
import { createSessionPlugin, type SessionStore } from '@backend/core/session'
import { createAuthRoutes } from '@backend/routes/auth'
import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { Elysia } from 'elysia'

function makeMockClient(): OAuthClient {
  return {
    initiate: mock(async () => ({
      redirectUrl: 'https://commons.wikimedia.org/wiki/Special:OAuth/authorize?oauth_token=tok',
      requestToken: ['req_key', 'req_secret'] as [string, string],
    })),
    complete: mock(async () => ({
      accessToken: ['acc_key', 'acc_secret'] as [string, string],
    })),
    identify: mock(async () => ({
      username: 'TestUser',
      sub: '123',
      editcount: 100,
      rights: ['autoconfirmed'],
    })),
  }
}

function makeTestApp(client?: OAuthClient) {
  const store = new Map<string, string>()
  const sessionStore: SessionStore = {
    async get(k) {
      return store.get(k) ?? null
    },
    async set(k, v, _ex, _ttl) {
      store.set(k, v)
    },
    async del(k) {
      store.delete(k)
    },
  }
  const session = createSessionPlugin(sessionStore)
  const authRoutes = createAuthRoutes(client ?? makeMockClient())
  return new Elysia().use(session).use(authRoutes)
}

describe('GET /auth/whoami', () => {
  it('returns 401 when not logged in', async () => {
    const app = makeTestApp()
    const res = await app.handle(new Request('http://localhost/auth/whoami'))
    expect(res.status).toBe(401)
  })
})

describe('GET /auth/login', () => {
  it('redirects to Wikimedia OAuth authorize URL', async () => {
    const app = makeTestApp()
    const res = await app.handle(new Request('http://localhost/auth/login'))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('Special:OAuth/authorize')
  })
})

describe('GET /auth/logout', () => {
  it('redirects to / and clears session', async () => {
    const app = makeTestApp()
    const res = await app.handle(new Request('http://localhost/auth/logout'))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
  })
})

describe('GET /auth/callback', () => {
  it('redirects to / on successful OAuth flow', async () => {
    const app = makeTestApp()

    const loginRes = await app.handle(new Request('http://localhost/auth/login'))
    const cookie = (loginRes.headers.get('set-cookie') ?? '').split(';')[0]

    const callbackRes = await app.handle(
      new Request('http://localhost/auth/callback?oauth_token=tok&oauth_verifier=verifier123', {
        headers: { cookie },
      }),
    )
    expect(callbackRes.status).toBe(302)
    expect(callbackRes.headers.get('location')).toBe('/')
  })

  it('returns 400 when no request token in session', async () => {
    const app = makeTestApp()
    const res = await app.handle(
      new Request('http://localhost/auth/callback?oauth_token=tok&oauth_verifier=v'),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when oauth params are missing', async () => {
    const app = makeTestApp()
    const res = await app.handle(new Request('http://localhost/auth/callback'))
    expect(res.status).toBe(400)
  })
})

describe('POST /auth/register', () => {
  beforeAll(() => {
    process.env.X_USERNAME = 'BotUser'
    process.env.X_API_KEY = 'secret_key'
  })

  it('returns 200 and sets session for valid API key', async () => {
    const app = makeTestApp()
    const res = await app.handle(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'X-API-KEY': 'secret_key' },
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { username: string }
    expect(body.username).toBe('BotUser')
  })

  it('returns 401 for wrong API key', async () => {
    const app = makeTestApp()
    const res = await app.handle(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'X-API-KEY': 'wrong_key' },
      }),
    )
    expect(res.status).toBe(401)
  })
})
