import { staticPlugin } from '@elysiajs/static'
import { Elysia } from 'elysia'
import path from 'node:path'
import type { createSessionPlugin } from './core/session'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'

type SessionPlugin = ReturnType<typeof createSessionPlugin>

const buildApi = (session: SessionPlugin) =>
  new Elysia()
    .use(session)
    .get('/health', () => ({ status: 'ok' }))
    .use(authRoutes)
    .use(adminRoutes)

export type App = ReturnType<typeof buildApi>

export const createApp = (session: SessionPlugin) => {
  const base = buildApi(session)
  const STATIC_DIR = Bun.env.STATIC_DIR
  return STATIC_DIR
    ? base
        .use(staticPlugin({ assets: STATIC_DIR, prefix: '/' }))
        .get('/*', () => Bun.file(path.join(STATIC_DIR, 'index.html')))
    : base
}
