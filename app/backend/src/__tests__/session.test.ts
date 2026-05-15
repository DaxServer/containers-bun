import { createSessionPlugin, type SessionStore } from '@backend/core/session'
import { beforeEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'

function makeMemStore(): SessionStore {
  const store = new Map<string, string>()
  return {
    async get(key) {
      return store.get(key) ?? null
    },
    async set(key, value, _ex, _ttl) {
      store.set(key, value)
    },
    async del(key) {
      store.delete(key)
    },
  }
}

describe('session plugin', () => {
  let store: SessionStore

  beforeEach(() => {
    store = makeMemStore()
  })

  it('injects empty session on first request', async () => {
    const app = new Elysia()
      .use(createSessionPlugin(store))
      .get('/test', ({ session }) => ({ user: session.user ?? null }))

    const res = await app.handle(new Request('http://localhost/test'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ user: null })
  })

  it('persists session data after save()', async () => {
    const app = new Elysia()
      .use(createSessionPlugin(store))
      .get('/write', async ({ session }) => {
        session.user = {
          username: 'Alice',
          sub: '1',
          editcount: 100,
          rights: ['autoconfirmed'],
        }
        await session.save()
        return { ok: true }
      })
      .get('/read', ({ session }) => ({
        username: session.user?.username ?? null,
      }))

    const writeRes = await app.handle(new Request('http://localhost/write'))
    expect(writeRes.status).toBe(200)

    const cookie = writeRes.headers.get('set-cookie') ?? ''
    const sessionCookie = cookie.split(';')[0]

    const readRes = await app.handle(
      new Request('http://localhost/read', {
        headers: { cookie: sessionCookie },
      }),
    )
    expect(readRes.status).toBe(200)
    expect(await readRes.json()).toEqual({ username: 'Alice' })
  })

  it('clears session data on clear()', async () => {
    const app = new Elysia()
      .use(createSessionPlugin(store))
      .get('/write', async ({ session }) => {
        session.user = {
          username: 'Alice',
          sub: '1',
          editcount: 100,
          rights: ['autoconfirmed'],
        }
        await session.save()
        return { ok: true }
      })
      .get('/clear', async ({ session }) => {
        session.clear()
        await session.save()
        return { ok: true }
      })
      .get('/read', ({ session }) => ({ user: session.user ?? null }))

    const writeRes = await app.handle(new Request('http://localhost/write'))
    const cookie = (writeRes.headers.get('set-cookie') ?? '').split(';')[0]

    await app.handle(new Request('http://localhost/clear', { headers: { cookie } }))

    const readRes = await app.handle(new Request('http://localhost/read', { headers: { cookie } }))
    expect((await readRes.json()).user).toBeNull()
  })
})
