import { Elysia } from 'elysia'
import { createSessionPlugin } from './session'

const _noopStore = {
  async get(_k: string): Promise<null> {
    return null
  },
  async set(_k: string, _v: string, _ex: 'EX', _ttl: number): Promise<void> {},
  async del(_k: string): Promise<void> {},
}

export const requireAuth = new Elysia({ name: 'require-auth' })
  .use(createSessionPlugin(_noopStore))
  .derive({ as: 'local' }, ({ session }) => {
    if (!session.user) {
      throw new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }
    return { user: session.user }
  })
