import { describe, expect, it, beforeAll } from 'bun:test'

let app: Awaited<typeof import('@/app')>['app']

beforeAll(async () => {
  process.env.STATIC_DIR = import.meta.dir
  app = (await import('@/app')).app
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
