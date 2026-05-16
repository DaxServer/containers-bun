import { staticPlugin } from '@elysiajs/static'
import { Elysia } from 'elysia'
import type { Redis } from 'ioredis'
import path from 'node:path'
import type { createSessionPlugin } from './core/session'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { createWsRoutes } from './routes/ws'

type SessionPlugin = ReturnType<typeof createSessionPlugin>

const buildApi = (session: SessionPlugin, redis: Redis) =>
  new Elysia()
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
