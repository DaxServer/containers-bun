import { createApp } from '@backend/app'
import { createSessionPlugin, type SessionStore } from '@backend/core/session'
import { beforeAll, describe, expect, it } from 'bun:test'

const noop: SessionStore = {
  async get() {
    return null
  },
  async set() {},
  async del() {},
}

let app: ReturnType<typeof createApp>

beforeAll(() => {
  process.env.STATIC_DIR = import.meta.dir
  app = createApp(createSessionPlugin(noop))
})

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const response = await app.handle(new Request('http://localhost/health'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(body).toEqual({ status: 'ok' })
  })
})
