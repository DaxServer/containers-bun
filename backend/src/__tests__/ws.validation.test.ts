import { createSessionPlugin } from '@backend/core/session'
import { ClientMessage } from '@backend/types/ws'
import { afterAll, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'

// ============================================================
// Test setup — a minimal WS app with only body validation,
// no Handler business logic, no .onError() hook.
//
// When body validation fails, Elysia (1.4.28 Bun adapter) sends
// back a JSON object { type: "validation", on: "message", ... }
// because hasCustomErrorHandlers is false. Valid messages receive
// an echo { received: <type> }. Tests distinguish the two by
// checking the "received" field.
// ============================================================

const SESSION_ID = 'ws-validation-test-session'

function makeTestSessionStore() {
  const store = new Map<string, string>()
  store.set(
    `session:${SESSION_ID}`,
    JSON.stringify({
      user: { username: 'TestUser', sub: '1', editcount: 100, rights: ['autoconfirmed'] },
      access_token: ['token-key', 'token-secret'],
    }),
  )
  return {
    async get(k: string) {
      return store.get(k) ?? null
    },
    async set(k: string, v: string, _ex: 'EX', _ttl: number) {
      store.set(k, v)
    },
    async del(k: string) {
      store.delete(k)
    },
  }
}

const app = new Elysia()
  .use(createSessionPlugin(makeTestSessionStore()))
  .ws('/ws', {
    body: ClientMessage,
    open(ws) {
      if (!ws.data.session.user) ws.close(1008, 'Unauthorized')
    },
    message(ws, body) {
      ws.send(JSON.stringify({ received: body.type }))
    },
  })
  .listen(0)

const PORT = app.server!.port

afterAll(() => app.stop(true))

async function wsConnect(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws`, {
      headers: { cookie: `session_id=${SESSION_ID}` },
    } as unknown as string[])
    ws.addEventListener('open', () => resolve(ws))
    ws.addEventListener('error', reject)
  })
}

async function wsSendAndCollect(ws: WebSocket, msg: unknown, waitMs = 150): Promise<string[]> {
  const received: string[] = []
  ws.addEventListener('message', (e) => received.push(e.data as string))
  ws.send(JSON.stringify(msg))
  await Bun.sleep(waitMs)
  return received
}

// ============================================================
// Guard test — verifies the test harness can detect validation
// failures before trusting the passing tests below.
// ============================================================
describe('guard: invalid message triggers body validation error', () => {
  it('unknown type causes Elysia to send back a validation error JSON', async () => {
    const ws = await wsConnect()
    const msgs = await wsSendAndCollect(ws, { type: 'UNKNOWN_TYPE', data: {} })
    ws.close()

    expect(msgs.length).toBeGreaterThan(0)
    const parsed = JSON.parse(msgs[0]!) as Record<string, unknown>
    expect(parsed.type).toBe('validation')
    expect(parsed.on).toBe('message')
  })
})

// ============================================================
// Validation tests — each message type sent by loadCollection()
// ============================================================
describe('FETCH_PRESETS body validation', () => {
  it('passes with mapillary handler', async () => {
    const ws = await wsConnect()
    const msgs = await wsSendAndCollect(ws, {
      type: 'FETCH_PRESETS',
      data: { handler: 'mapillary' },
    })
    ws.close()

    const received = msgs.map((m) => {
      try {
        return (JSON.parse(m) as { received?: string }).received
      } catch {
        return null
      }
    })
    expect(received).toContain('FETCH_PRESETS')
  })
})

describe('FETCH_IMAGES body validation', () => {
  it('passes with empty string data (store.input default)', async () => {
    const ws = await wsConnect()
    const msgs = await wsSendAndCollect(ws, {
      type: 'FETCH_IMAGES',
      data: '',
      handler: 'mapillary',
    })
    ws.close()

    const received = msgs.map((m) => {
      try {
        return (JSON.parse(m) as { received?: string }).received
      } catch {
        return null
      }
    })
    expect(received).toContain('FETCH_IMAGES')
  })

  it('passes with a non-empty sequence id', async () => {
    const ws = await wsConnect()
    const msgs = await wsSendAndCollect(ws, {
      type: 'FETCH_IMAGES',
      data: 'LqNt2V0eQ2ClmDPEVHGqLg',
      handler: 'mapillary',
    })
    ws.close()

    const received = msgs.map((m) => {
      try {
        return (JSON.parse(m) as { received?: string }).received
      } catch {
        return null
      }
    })
    expect(received).toContain('FETCH_IMAGES')
  })
})
