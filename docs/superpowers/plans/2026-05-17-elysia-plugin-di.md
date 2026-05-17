# Elysia Plugin DI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all factory functions and constructor parameters from Elysia plugins. Every plugin becomes a top-level named constant. Dependencies are declared via `new Elysia({ name: '...' }).decorate(...)` and injected at composition time via Elysia's name-based deduplication — the first registration of a named plugin wins, so tests register mock plugins before importing routes.

**Architecture:**
- All plugins are top-level `new Elysia({ name: '...' })` constants — no factory functions, no parameters.
- Runtime singletons (Redis store, oauthClient) live inside named `decorate` plugins with lazy initialization (no connection at import time).
- `sessionPlugin` splits into `sessionStorePlugin` (provides the store) + `sessionPlugin` (derives session from the store).
- Tests build a thin wrapper app: register mock named plugins first, then `.use(routePlugin)`. Deduplication ensures mocks win.
- `index.ts` simplifies — no longer constructs session or passes redis to app.

**Tech Stack:** Elysia 1.4.x, Bun, `bun:test`

---

### Task 1: Refactor `session.ts`

**Files:**
- Modify: `backend/src/core/session.ts`

- [ ] **Step 1: Split into `sessionStorePlugin` + `sessionPlugin`**

`sessionStorePlugin` is a named `decorate` plugin that provides the `SessionStore`. It uses a lazy class so no Redis connection is made at import time. `sessionPlugin` is a top-level constant that reads `sessionStore` from context.

Replace the entire file:

```typescript
import { config } from '@backend/config'
import { Elysia } from 'elysia'
import { Redis } from 'ioredis'
import { randomUUID } from 'node:crypto'

export type SessionUser = {
  username: string
  sub: string
  editcount: number
  rights: string[]
}

export type SessionData = {
  user?: SessionUser
  access_token?: [string, string]
  request_token?: [string, string]
}

export type Session = SessionData & {
  save(): Promise<void>
  clear(): void
}

export interface SessionStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ex: 'EX', ttl: number): Promise<void>
  del(key: string): Promise<void>
}

const SESSION_TTL = 86400
const COOKIE_NAME = 'session_id'

class RedisSessionStore implements SessionStore {
  private _client: Redis | null = null

  private get client(): Redis {
    this._client ??= new Redis(config.redisUrl)
    return this._client
  }

  async get(key: string) {
    return this.client.get(key)
  }

  async set(key: string, value: string, ex: 'EX', ttl: number) {
    await this.client.set(key, value, ex, ttl)
  }

  async del(key: string) {
    await this.client.del(key)
  }
}

export const sessionStorePlugin = new Elysia({ name: 'session-store' }).decorate(
  'sessionStore',
  new RedisSessionStore() as SessionStore,
)

export const sessionPlugin = new Elysia({ name: 'session' })
  .use(sessionStorePlugin)
  .derive({ as: 'global' }, async ({ sessionStore, cookie }) => {
    const id = cookie[COOKIE_NAME]?.value ?? randomUUID()
    const raw = await sessionStore.get(`session:${id}`)
    const stored: SessionData = raw ? JSON.parse(raw) : {}

    const session: Session = {
      ...stored,
      async save() {
        const { save: _s, clear: _c, ...plain } = session
        await sessionStore.set(`session:${id}`, JSON.stringify(plain), 'EX', SESSION_TTL)
        cookie[COOKIE_NAME]!.set({
          value: id,
          httpOnly: true,
          sameSite: 'lax',
          maxAge: SESSION_TTL,
          path: '/',
        })
      },
      clear() {
        delete session.user
        delete session.access_token
        delete session.request_token
      },
    }

    return { session }
  })
```

- [ ] **Step 2: Update `session.test.ts` to use wrapper app with mock store plugin**

Replace the entire file:

```typescript
import { sessionPlugin, sessionStorePlugin, type SessionStore } from '@backend/core/session'
import { beforeEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'

function makeTestStorePlugin(store = new Map<string, string>()) {
  const sessionStore: SessionStore = {
    async get(key) { return store.get(key) ?? null },
    async set(key, value, _ex, _ttl) { store.set(key, value) },
    async del(key) { store.delete(key) },
  }
  return { plugin: new Elysia({ name: 'session-store' }).decorate('sessionStore', sessionStore), store }
}

describe('session plugin', () => {
  it('injects empty session on first request', async () => {
    const { plugin } = makeTestStorePlugin()
    const app = new Elysia()
      .use(plugin)
      .use(sessionPlugin)
      .get('/test', ({ session }) => ({ user: session.user ?? null }))

    const res = await app.handle(new Request('http://localhost/test'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ user: null })
  })

  it('persists session data after save()', async () => {
    const { plugin } = makeTestStorePlugin()
    const app = new Elysia()
      .use(plugin)
      .use(sessionPlugin)
      .get('/write', async ({ session }) => {
        session.user = { username: 'Alice', sub: '1', editcount: 100, rights: ['autoconfirmed'] }
        await session.save()
        return { ok: true }
      })
      .get('/read', ({ session }) => ({ username: session.user?.username ?? null }))

    const writeRes = await app.handle(new Request('http://localhost/write'))
    expect(writeRes.status).toBe(200)

    const cookie = writeRes.headers.get('set-cookie') ?? ''
    const sessionCookie = cookie.split(';')[0]

    const readRes = await app.handle(
      new Request('http://localhost/read', { headers: { cookie: sessionCookie } }),
    )
    expect(readRes.status).toBe(200)
    expect(await readRes.json()).toEqual({ username: 'Alice' })
  })

  it('clears session data on clear()', async () => {
    const { plugin } = makeTestStorePlugin()
    const app = new Elysia()
      .use(plugin)
      .use(sessionPlugin)
      .get('/write', async ({ session }) => {
        session.user = { username: 'Alice', sub: '1', editcount: 100, rights: ['autoconfirmed'] }
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
```

- [ ] **Step 3: Run tests and typecheck**

```bash
bun test backend/src/__tests__/session.test.ts && bun typecheck
```

Expected: all pass.

---

### Task 2: Refactor `devAuth.ts`

**Files:**
- Modify: `backend/src/core/devAuth.ts`

- [ ] **Step 1: Make `devAuthPlugin` a top-level constant**

No parameters — it `.use(sessionPlugin)` directly as a top-level named constant. Replace the entire file:

```typescript
import { config } from '@backend/config'
import { sessionPlugin } from '@backend/core/session'
import { Elysia } from 'elysia'

export const devAuthPlugin = new Elysia({ name: 'dev-auth' })
  .use(sessionPlugin)
  .onBeforeHandle({ as: 'global' }, async ({ session }) => {
    if (Bun.env.DEV_MOCK_AUTH !== 'true' || session.user) return
    session.user = {
      username: Bun.env.DEV_MOCK_USERNAME ?? config.xUsername,
      sub: Bun.env.DEV_MOCK_SUB ?? 'dev-user-1',
      editcount: 100,
      rights: ['autoconfirmed'],
    }
    await session.save()
  })
```

- [ ] **Step 2: Run typecheck**

```bash
bun typecheck
```

Expected: no errors.

---

### Task 3: Refactor `auth.ts`

**Files:**
- Modify: `backend/src/routes/auth.ts`

- [ ] **Step 1: Make `authRoutes` a top-level constant with named `decorate` plugins**

`oauthPlugin` provides the client via `decorate`. `authRoutes` is a top-level constant. Replace the entire file:

```typescript
import { config } from '@backend/config'
import { createOAuthClient } from '@backend/core/oauthClient'
import { sessionPlugin } from '@backend/core/session'
import { Elysia } from 'elysia'

const MIN_EDITCOUNT = 50

export const oauthPlugin = new Elysia({ name: 'oauth-client' }).decorate(
  'oauthClient',
  createOAuthClient(config.oauthKey, config.oauthSecret),
)

export const authRoutes = new Elysia({ name: 'auth-routes', prefix: '/auth' })
  .use(sessionPlugin)
  .use(oauthPlugin)
  .get('/login', async ({ oauthClient, session, redirect }) => {
    const { redirectUrl, requestToken } = await oauthClient.initiate()
    session.request_token = requestToken
    await session.save()

    return redirect(redirectUrl, 302)
  })
  .get('/callback', async ({ oauthClient, session, query, redirect, set }) => {
    if (!session.request_token) {
      set.status = 400
      return 'No request token in session'
    }
    if (!query.oauth_token || !query.oauth_verifier) {
      set.status = 400
      return 'Missing required OAuth parameters'
    }

    const { accessToken } = await oauthClient.complete(
      session.request_token,
      new URLSearchParams(query as Record<string, string>).toString(),
    )
    const identity = await oauthClient.identify(accessToken)

    if (identity.editcount < MIN_EDITCOUNT || !identity.rights.includes('autoconfirmed')) {
      set.status = 403
      return 'You must be an autoconfirmed Commons user with at least 50 edits to use this tool.'
    }

    session.user = {
      username: identity.username,
      sub: identity.sub,
      editcount: identity.editcount,
      rights: identity.rights,
    }
    session.access_token = accessToken
    delete session.request_token
    await session.save()

    return redirect('/', 302)
  })
  .get('/logout', async ({ session, redirect }) => {
    session.clear()
    await session.save()
    return redirect('/', 302)
  })
  .get('/whoami', ({ session, set }) => {
    if (!session.user) {
      set.status = 401
      return { message: 'Unauthorized' }
    }
    return {
      username: session.user.username,
      userid: session.user.sub,
      authorized: config.xUsername === session.user.username,
      isMock:
        Bun.env.DEV_MOCK_AUTH === 'true' &&
        session.user.sub === (Bun.env.DEV_MOCK_SUB ?? 'dev-user-1'),
    }
  })
  .post('/register', async ({ session, headers, set }) => {
    // Read live from env so tests can inject values via process.env
    const xUsername = Bun.env.X_USERNAME ?? ''
    const xApiKey = Bun.env.X_API_KEY ?? ''
    if (!xUsername || !xApiKey) {
      set.status = 500
      return { message: 'Server configuration error: API key or username not set' }
    }

    const providedKey = headers['x-api-key']
    if (!providedKey) {
      set.status = 400
      return { message: 'Missing X-API-KEY header' }
    }

    if (providedKey !== xApiKey) {
      set.status = 401
      return { message: 'Invalid API key' }
    }

    session.user = {
      username: xUsername,
      sub: 'bot-user-id',
      editcount: 0,
      rights: [],
    }
    session.access_token = ['test-key', 'test-secret']
    await session.save()

    return { message: 'User registered successfully', username: xUsername }
  })
```

- [ ] **Step 2: Run typecheck**

```bash
bun typecheck
```

Expected: no errors.

---

### Task 4: Refactor `admin.ts`

**Files:**
- Modify: `backend/src/routes/admin.ts`

- [ ] **Step 1: Make `adminRoutes` a top-level constant**

`dalPlugin` and `sessionPlugin` are top-level named plugins. `requireAdmin` and `adminRoutes` are top-level constants. Replace the entire file:

```typescript
import { config } from '@backend/config'
import { encryptAccessToken } from '@backend/core/crypto'
import { sessionPlugin } from '@backend/core/session'
import * as batchesDal from '@backend/db/dal/batches'
import * as presetsDal from '@backend/db/dal/presets'
import * as uploadsDal from '@backend/db/dal/uploads'
import * as usersDal from '@backend/db/dal/users'
import Elysia, { t } from 'elysia'

type AdminDal = {
  users: typeof usersDal
  batches: typeof batchesDal
  presets: typeof presetsDal
  uploads: typeof uploadsDal
}

export const dalPlugin = new Elysia({ name: 'admin-dal' }).decorate('dal', {
  users: usersDal,
  batches: batchesDal,
  presets: presetsDal,
  uploads: uploadsDal,
} as AdminDal)

const requireAdmin = new Elysia({ name: 'require-admin' })
  .use(sessionPlugin)
  .derive({ as: 'scoped' }, ({ session }) => {
    if (!session.user) {
      throw new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (session.user.username !== config.xUsername) {
      throw new Response(JSON.stringify({ message: 'Forbidden' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
    }
    return { user: session.user }
  })

export const adminRoutes = new Elysia({ name: 'admin-routes', prefix: '/api/admin' })
  .use(dalPlugin)
  .use(requireAdmin)

  .get(
    '/batches',
    async ({ dal, query }) => {
      const offset = ((query.page ?? 1) - 1) * (query.limit ?? 100)
      const [items, total] = await Promise.all([
        dal.batches.getBatches({ offset, limit: query.limit ?? 100, filterText: query.filter_text }),
        dal.batches.countBatches({ filterText: query.filter_text }),
      ])
      return { items, total }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric()),
        limit: t.Optional(t.Numeric()),
        filter_text: t.Optional(t.String()),
      }),
    },
  )

  .get(
    '/users',
    async ({ dal, query }) => {
      const offset = ((query.page ?? 1) - 1) * (query.limit ?? 100)
      const [items, total] = await Promise.all([
        dal.users.getUsers({ offset, limit: query.limit ?? 100, filterText: query.filter_text }),
        dal.users.countUsers({ filterText: query.filter_text }),
      ])
      return { items, total }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric()),
        limit: t.Optional(t.Numeric()),
        filter_text: t.Optional(t.String()),
      }),
    },
  )

  .get(
    '/upload_requests',
    async ({ dal, query }) => {
      const offset = ((query.page ?? 1) - 1) * (query.limit ?? 100)
      const statuses = query.status
        ? Array.isArray(query.status)
          ? query.status
          : [query.status]
        : undefined
      const dateFrom = query.date_from ? new Date(query.date_from) : undefined
      const dateTo = query.date_to ? new Date(query.date_to) : undefined
      const [items, total] = await Promise.all([
        dal.uploads.getAllUploadRequests({
          offset,
          limit: query.limit ?? 100,
          filterText: query.filter_text,
          statuses,
          dateFrom,
          dateTo,
        }),
        dal.uploads.countAllUploadRequests({
          filterText: query.filter_text,
          statuses,
          dateFrom,
          dateTo,
        }),
      ])
      return { items, total }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric()),
        limit: t.Optional(t.Numeric()),
        filter_text: t.Optional(t.String()),
        status: t.Optional(t.Union([t.String(), t.Array(t.String())])),
        date_from: t.Optional(t.String()),
        date_to: t.Optional(t.String()),
      }),
    },
  )

  .post(
    '/upload_requests/bulk-cancel',
    async ({ dal, body }) => {
      const cancelled_count = await dal.uploads.cancelUploadRequests(body.ids)
      return { cancelled_count }
    },
    { body: t.Object({ ids: t.Array(t.Number()) }) },
  )

  .post(
    '/upload_requests/bulk-fail',
    async ({ dal, body }) => {
      const failed_count = await dal.uploads.failUploadRequests(body.ids)
      return { failed_count }
    },
    { body: t.Object({ ids: t.Array(t.Number()) }) },
  )

  .get(
    '/presets',
    async ({ dal, query }) => {
      const offset = ((query.page ?? 1) - 1) * (query.limit ?? 100)
      const [items, total] = await Promise.all([
        dal.presets.getAllPresets({
          offset,
          limit: query.limit ?? 100,
          filterText: query.filter_text,
        }),
        dal.presets.countAllPresets({ filterText: query.filter_text }),
      ])
      return { items, total }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric()),
        limit: t.Optional(t.Numeric()),
        filter_text: t.Optional(t.String()),
      }),
    },
  )

  .get(
    '/failed_uploads',
    async ({ dal, query }) => {
      const offset = ((query.page ?? 1) - 1) * (query.limit ?? 50)
      return dal.uploads.getFailedUploadsGrouped({
        offset,
        limit: query.limit ?? 50,
        sortBy: query.sort_by as 'recent' | 'batchSize' | 'errorType' | 'user' | undefined,
        errorType: query.error_type,
        handler: query.handler,
        searchText: query.search_text,
      })
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric()),
        limit: t.Optional(t.Numeric()),
        sort_by: t.Optional(t.String()),
        error_type: t.Optional(t.String()),
        handler: t.Optional(t.String()),
        search_text: t.Optional(t.String()),
      }),
    },
  )

  .put(
    '/upload_requests/:id',
    async ({ dal, params, body, set }) => {
      const ok = await dal.uploads.updateUploadFields(Number(params.id), body)
      if (!ok) {
        set.status = 404
        return { message: 'Not found' }
      }
      return { message: 'Upload request updated successfully' }
    },
    {
      body: t.Object({
        status: t.Optional(t.String()),
        error: t.Optional(t.Any()),
      }),
    },
  )

  .post(
    '/retry',
    async ({ dal, body, session, set }) => {
      const tokenPair = session.access_token
      if (!tokenPair) {
        set.status = 401
        return { message: 'No access token in session' }
      }
      const encryptedToken = encryptAccessToken(tokenPair)
      const { newUploadIds, newBatchId } = await dal.uploads.retrySelectedUploadsToNewBatch(
        body.upload_ids,
        encryptedToken,
        session.user!.sub,
        session.user!.username,
      )
      return {
        message: `Retrying ${newUploadIds.length} of ${body.upload_ids.length} requested uploads`,
        retried_count: newUploadIds.length,
        requested_count: body.upload_ids.length,
        new_batch_id: newBatchId,
      }
    },
    { body: t.Object({ upload_ids: t.Array(t.Number()) }) },
  )
```

- [ ] **Step 2: Run typecheck**

```bash
bun typecheck
```

Expected: no errors.

---

### Task 5: Refactor `ws.ts`

**Files:**
- Modify: `backend/src/routes/ws.ts`

- [ ] **Step 1: Make `wsRoutes` a top-level constant with a named Redis plugin**

`redisPlugin` provides the Redis client via `decorate` with lazy init. `wsRoutes` is a top-level constant. Replace the entire file:

```typescript
import { Handler } from '@backend/core/handler'
import { sessionPlugin } from '@backend/core/session'
import { wsLogger } from '@backend/logger'
import { ClientMessage, ServerMessage } from '@backend/types/ws'
import { config } from '@backend/config'
import Elysia, { ValidationError } from 'elysia'
import { Redis } from 'ioredis'

class LazyRedis {
  private _client: Redis | null = null

  get client(): Redis {
    this._client ??= new Redis(config.redisUrl)
    return this._client
  }
}

export const redisPlugin = new Elysia({ name: 'redis' }).decorate('redis', new LazyRedis())

const connections = new Map<string, Handler>()

export const wsRoutes = new Elysia({ name: 'ws-routes' })
  .use(sessionPlugin)
  .use(redisPlugin)
  .onError(({ error }) => {
    if (error instanceof ValidationError) {
      wsLogger.error({ errors: error.all, message: error.message }, 'WebSocket validation error')
    }
  })
  .ws('/ws', {
    body: ClientMessage,
    response: ServerMessage,
    open(ws) {
      if (!ws.data.session.user) {
        ws.close(1008, 'Unauthorized')
        return
      }
      if (!ws.data.session.access_token) {
        ws.close(1008, 'Unauthorized')
        return
      }
      const user = {
        ...ws.data.session.user,
        access_token: ws.data.session.access_token,
      }
      const sender = { send: (msg: ServerMessage) => ws.send(msg) }
      const handler = new Handler(user, sender, ws.data.redis.client)
      connections.set(ws.id, handler)
    },
    message(ws, body) {
      if (!ws.data.session.user) {
        ws.close(1008, 'Unauthorized')
        return
      }
      const handler = connections.get(ws.id)
      if (!handler) {
        ws.close(1011, 'Handler not initialized')
        return
      }
      switch (body.type) {
        case 'FETCH_BATCHES':
          handler.fetchBatches(body.data)
          break
        case 'FETCH_BATCH_UPLOADS':
          handler.fetchBatchUploads(body.data)
          break
        case 'RETRY_UPLOADS':
          handler.retryUploads(body.data)
          break
        case 'CANCEL_BATCH':
          handler.cancelBatch(body.data)
          break
        case 'SUBSCRIBE_BATCH':
          handler.subscribeBatch(body.data)
          break
        case 'SUBSCRIBE_BATCHES_LIST':
          handler.subscribeBatchesList(body.data)
          break
        case 'UNSUBSCRIBE_BATCH':
          handler.unsubscribeBatch()
          break
        case 'UNSUBSCRIBE_BATCHES_LIST':
          handler.unsubscribeBatchesList()
          break
        case 'CREATE_BATCH':
          handler.createBatch()
          break
        case 'DELETE_PRESET':
          handler.deletePreset(body.data.preset_id)
          break
        case 'FETCH_IMAGES':
          handler.fetchImages(body.data, body.handler)
          break
        case 'FETCH_PRESETS':
          handler.fetchPresets(body.data.handler)
          break
        case 'SAVE_PRESET':
          handler.savePreset(body.data)
          break
        case 'UPLOAD_SLICE':
          handler.uploadSlice(body.data)
          break
        case 'CHECK_CATEGORIES_DELETED':
          handler.checkCategoriesDeleted(body.data.titles)
          break
        case 'CREATE_CATEGORY':
          handler.createCategory(body.data.title, body.data.text, body.data.wikidata_qid)
          break
        case 'RECATEGORIZE_FILES':
          handler.recategorizeFiles(body.data.source, body.data.target)
          break
      }
    },
    close(ws) {
      const handler = connections.get(ws.id)
      handler?.cancelTasks()
      connections.delete(ws.id)
    },
  })
```

- [ ] **Step 2: Run typecheck**

```bash
bun typecheck
```

Expected: no errors.

---

### Task 6: Simplify `app.ts` and `index.ts`

**Files:**
- Modify: `backend/src/app.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: `app.ts` — compose top-level plugin constants, no parameters**

Replace the entire file:

```typescript
import { devAuthPlugin } from '@backend/core/devAuth'
import { logger } from '@backend/logger'
import { adminRoutes } from '@backend/routes/admin'
import { authRoutes } from '@backend/routes/auth'
import { wsRoutes } from '@backend/routes/ws'
import { staticPlugin } from '@elysiajs/static'
import { Elysia } from 'elysia'
import logixlysia from 'logixlysia'
import path from 'node:path'

const isTest = Bun.env.NODE_ENV === 'test'

export const app = new Elysia()
  .use(logixlysia({ config: { pino: logger, useTransportsOnly: isTest } }))
  .use(devAuthPlugin)
  .get('/health', () => ({ status: 'ok' }))
  .use(authRoutes)
  .use(adminRoutes)
  .use(wsRoutes)

export type App = typeof app

export const createApp = () => {
  const STATIC_DIR = Bun.env.STATIC_DIR
  return STATIC_DIR
    ? app
        .use(staticPlugin({ assets: STATIC_DIR, prefix: '/' }))
        .get('/*', () => Bun.file(path.join(STATIC_DIR, 'index.html')))
    : app
}
```

- [ ] **Step 2: `index.ts` — simplified startup, no more session/redis construction**

Replace the entire file:

```typescript
import { createApp } from '@backend/app'
import { config } from '@backend/config'
import { logger } from '@backend/logger'
import { createUploadWorker } from '@backend/workers/upload.worker'
import { Redis } from 'ioredis'

const redis = new Redis(config.redisUrl)
const worker = createUploadWorker(redis)
worker.on('error', (err) => logger.error({ err }, 'Worker error'))

createApp().listen(config.port, () => {
  logger.info({ port: config.port }, 'curator-server listening')
})
```

- [ ] **Step 3: Run typecheck**

```bash
bun typecheck
```

Expected: no errors. Note: `App` type is now `typeof app` — update any consumers if needed.

---

### Task 7: Update `auth.test.ts`

**Files:**
- Modify: `backend/src/__tests__/auth.test.ts`

- [ ] **Step 1: Use wrapper app — register mock plugins first, then `.use(authRoutes)`**

Tests override `session-store` and `oauth-client` by registering mock named plugins before `authRoutes`. Deduplication ensures the mocks win. Replace the entire file:

```typescript
import type { OAuthClient } from '@backend/core/oauthClient'
import { sessionPlugin, type SessionStore } from '@backend/core/session'
import { authRoutes } from '@backend/routes/auth'
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
    async get(k) { return store.get(k) ?? null },
    async set(k, v, _ex, _ttl) { store.set(k, v) },
    async del(k) { store.delete(k) },
  }
  return new Elysia()
    .use(new Elysia({ name: 'session-store' }).decorate('sessionStore', sessionStore))
    .use(new Elysia({ name: 'oauth-client' }).decorate('oauthClient', client ?? makeMockClient()))
    .use(authRoutes)
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
```

- [ ] **Step 2: Run tests**

```bash
bun test backend/src/__tests__/auth.test.ts
```

Expected: all tests pass.

---

### Task 8: Update `admin.test.ts`

**Files:**
- Modify: `backend/src/__tests__/admin.test.ts`

- [ ] **Step 1: Use wrapper app — register mock plugins first, then `.use(adminRoutes)`**

Replace the entire file:

```typescript
import { type SessionStore } from '@backend/core/session'
import type * as batchesDal from '@backend/db/dal/batches'
import type * as presetsDal from '@backend/db/dal/presets'
import type * as uploadsDal from '@backend/db/dal/uploads'
import type * as usersDal from '@backend/db/dal/users'
import { adminRoutes } from '@backend/routes/admin'
import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { Elysia } from 'elysia'

const TEST_ENCRYPTION_KEY = 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE'

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY
})

function makeStore() {
  const m = new Map<string, string>()
  const store: SessionStore = {
    async get(k) { return m.get(k) ?? null },
    async set(k, v, _ex, _ttl) { m.set(k, v) },
    async del(k) { m.delete(k) },
  }
  return { m, store }
}

function seedSession(m: Map<string, string>, username = 'DaxServer', sub = '1'): string {
  const id = 'test-session'
  m.set(`session:${id}`, JSON.stringify({ user: { username, sub } }))
  return `session_id=${id}`
}

function seedSessionWithToken(m: Map<string, string>): string {
  const id = 'test-token-session'
  m.set(
    `session:${id}`,
    JSON.stringify({
      user: { username: 'DaxServer', sub: '1' },
      access_token: ['tok', 'secret'],
    }),
  )
  return `session_id=${id}`
}

type DalOverrides = {
  uploads?: object
  batches?: object
  users?: object
  presets?: object
}

function makeTestApp(overrides: DalOverrides = {}) {
  const { m, store } = makeStore()

  const mockBatches = {
    getBatches: mock(async () => []),
    countBatches: mock(async () => 0),
  }
  const mockUsers = {
    getUsers: mock(async () => []),
    countUsers: mock(async () => 0),
  }
  const mockPresets = {
    getAllPresets: mock(async () => []),
    countAllPresets: mock(async () => 0),
  }
  const mockUploads = {
    getAllUploadRequests: mock(async () => []),
    countAllUploadRequests: mock(async () => 0),
    cancelUploadRequests: mock(async () => 0),
    failUploadRequests: mock(async () => 0),
    getFailedUploadsGrouped: mock(async () => ({ items: [], total: 0 })),
    updateUploadFields: mock(async () => true),
    retrySelectedUploadsToNewBatch: mock(async () => ({
      newUploadIds: [10],
      editGroupId: 'eg-123',
      newBatchId: 5,
    })),
  }

  const app = new Elysia()
    .use(new Elysia({ name: 'session-store' }).decorate('sessionStore', store))
    .use(
      new Elysia({ name: 'admin-dal' }).decorate('dal', {
        users: { ...mockUsers, ...(overrides.users ?? {}) } as unknown as typeof usersDal,
        batches: { ...mockBatches, ...(overrides.batches ?? {}) } as unknown as typeof batchesDal,
        presets: { ...mockPresets, ...(overrides.presets ?? {}) } as unknown as typeof presetsDal,
        uploads: { ...mockUploads, ...(overrides.uploads ?? {}) } as unknown as typeof uploadsDal,
      }),
    )
    .use(adminRoutes)

  return { app, m }
}

describe('admin auth guard', () => {
  it('returns 401 for unauthenticated request', async () => {
    const { app } = makeTestApp()
    const res = await app.handle(new Request('http://localhost/api/admin/batches'))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin authenticated request', async () => {
    const { app, m } = makeTestApp()
    const cookie = seedSession(m, 'OtherUser', '99')
    const res = await app.handle(
      new Request('http://localhost/api/admin/batches', { headers: { cookie } }),
    )
    expect(res.status).toBe(403)
  })
})

describe('GET /api/admin/batches', () => {
  it('returns 200 with items and total for admin', async () => {
    const { app, m } = makeTestApp()
    const cookie = seedSession(m)
    const res = await app.handle(
      new Request('http://localhost/api/admin/batches', { headers: { cookie } }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[]; total: number }
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
  })
})

describe('GET /api/admin/users', () => {
  it('returns 200 with items and total for admin', async () => {
    const { app, m } = makeTestApp()
    const cookie = seedSession(m)
    const res = await app.handle(
      new Request('http://localhost/api/admin/users', { headers: { cookie } }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[]; total: number }
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
  })
})

describe('GET /api/admin/upload_requests', () => {
  it('returns 200 with items and total for admin', async () => {
    const { app, m } = makeTestApp()
    const cookie = seedSession(m)
    const res = await app.handle(
      new Request('http://localhost/api/admin/upload_requests', { headers: { cookie } }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[]; total: number }
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
  })
})

describe('POST /api/admin/upload_requests/bulk-cancel', () => {
  it('returns 200 with cancelled_count for admin', async () => {
    const { app, m } = makeTestApp()
    const cookie = seedSession(m)
    const res = await app.handle(
      new Request('http://localhost/api/admin/upload_requests/bulk-cancel', {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ ids: [1, 2] }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { cancelled_count: number }
    expect(typeof body.cancelled_count).toBe('number')
  })
})

describe('POST /api/admin/upload_requests/bulk-fail', () => {
  it('returns 200 with failed_count for admin', async () => {
    const { app, m } = makeTestApp()
    const cookie = seedSession(m)
    const res = await app.handle(
      new Request('http://localhost/api/admin/upload_requests/bulk-fail', {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ ids: [3, 4] }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { failed_count: number }
    expect(typeof body.failed_count).toBe('number')
  })
})

describe('GET /api/admin/presets', () => {
  it('returns 200 with items and total for admin', async () => {
    const { app, m } = makeTestApp()
    const cookie = seedSession(m)
    const res = await app.handle(
      new Request('http://localhost/api/admin/presets', { headers: { cookie } }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[]; total: number }
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
  })
})

describe('GET /api/admin/failed_uploads', () => {
  it('returns 200 with items and total for admin', async () => {
    const { app, m } = makeTestApp()
    const cookie = seedSession(m)
    const res = await app.handle(
      new Request('http://localhost/api/admin/failed_uploads', { headers: { cookie } }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[]; total: number }
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
  })
})

describe('PUT /api/admin/upload_requests/:id', () => {
  it('returns 200 when upload is found and updated', async () => {
    const { app, m } = makeTestApp()
    const cookie = seedSession(m)
    const res = await app.handle(
      new Request('http://localhost/api/admin/upload_requests/42', {
        method: 'PUT',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'queued' }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { message: string }
    expect(body.message).toContain('updated')
  })

  it('returns 404 when upload is not found', async () => {
    const { app, m } = makeTestApp({
      uploads: { updateUploadFields: mock(async () => false) },
    })
    const cookie = seedSession(m)
    const res = await app.handle(
      new Request('http://localhost/api/admin/upload_requests/999', {
        method: 'PUT',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'queued' }),
      }),
    )
    expect(res.status).toBe(404)
  })
})

describe('POST /api/admin/retry', () => {
  it('returns 200 with new_batch_id when access token present', async () => {
    const { app, m } = makeTestApp()
    const cookie = seedSessionWithToken(m)
    const res = await app.handle(
      new Request('http://localhost/api/admin/retry', {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ upload_ids: [1, 2] }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { new_batch_id: number }
    expect(typeof body.new_batch_id).toBe('number')
  })

  it('returns 401 when no access token in session', async () => {
    const { app, m } = makeTestApp()
    const cookie = seedSession(m)
    const res = await app.handle(
      new Request('http://localhost/api/admin/retry', {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ upload_ids: [1, 2] }),
      }),
    )
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run all tests**

```bash
bun test
```

Expected: all tests pass.

---

### Task 9: Final verification

- [ ] **Step 1: Run full check suite**

```bash
bun test && bun typecheck && bun lint && bun format
```

Expected: all pass.

- [ ] **Step 2: Commit**

```bash
git add backend/src/core/session.ts backend/src/core/devAuth.ts backend/src/routes/auth.ts backend/src/routes/admin.ts backend/src/routes/ws.ts backend/src/app.ts backend/src/index.ts backend/src/__tests__/session.test.ts backend/src/__tests__/auth.test.ts backend/src/__tests__/admin.test.ts
git commit -m "refactor: all plugins as top-level named constants, DI via decorate and deduplication"
```
