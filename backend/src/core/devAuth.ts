import { config } from '@backend/config'
import { createSessionPlugin } from '@backend/core/session'
import { Elysia } from 'elysia'

const _noopStore = {
  async get(_k: string): Promise<null> {
    return null
  },
  async set(_k: string, _v: string, _ex: 'EX', _ttl: number): Promise<void> {},
  async del(_k: string): Promise<void> {},
}

export const devAuthPlugin = new Elysia({ name: 'dev-auth' })
  .use(createSessionPlugin(_noopStore))
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
