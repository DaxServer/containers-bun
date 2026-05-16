import type { createSessionPlugin } from '@backend/core/session'
import { adminRoutes } from '@backend/routes/admin'
import { authRoutes } from '@backend/routes/auth'
import { createWsRoutes } from '@backend/routes/ws'
import { staticPlugin } from '@elysiajs/static'
import { Elysia } from 'elysia'
import type { Redis } from 'ioredis'
import logixlysia from 'logixlysia'
import path from 'node:path'

type SessionPlugin = ReturnType<typeof createSessionPlugin>

const buildApi = (session: SessionPlugin, redis: Redis) =>
  new Elysia()
    .use(logixlysia())
    .use(session)
    .get('/health', () => ({ status: 'ok' }))
    .use(authRoutes)
    .use(adminRoutes)
    .use(createWsRoutes(redis))

export type App = ReturnType<typeof buildApi>

export const createApp = (session: SessionPlugin, redis: Redis) => {
  const base = buildApi(session, redis)
  const STATIC_DIR = Bun.env.STATIC_DIR
  return STATIC_DIR
    ? base
        .use(staticPlugin({ assets: STATIC_DIR, prefix: '/' }))
        .get('/*', () => Bun.file(path.join(STATIC_DIR, 'index.html')))
    : base
}
