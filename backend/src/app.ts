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
