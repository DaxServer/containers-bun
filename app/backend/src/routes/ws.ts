import { createSessionPlugin } from '@backend/core/session'
import { ClientMessage } from '@backend/types/ws'
import Elysia from 'elysia'

const _noopStore = {
  async get(_k: string): Promise<null> {
    return null
  },
  async set(_k: string, _v: string, _ex: 'EX', _ttl: number): Promise<void> {},
  async del(_k: string): Promise<void> {},
}

export const wsRoutes = new Elysia()
  .use(createSessionPlugin(_noopStore))
  .ws('/ws', {
    body: ClientMessage,
    open(ws) {
      if (!ws.data.session.user) {
        ws.close(1008, 'Unauthorized')
        return
      }
      // TODO Task 6: ws.data.handler = new Handler(ws.data.session.user, ws)
    },
    message(ws, body) {
      if (!ws.data.session.user) {
        ws.close(1008, 'Unauthorized')
        return
      }
      // TODO Task 6: dispatch body.type → handler methods
      console.log('[ws] message:', body.type, 'from', ws.data.session.user.username)
    },
    close(_ws) {
      // TODO Task 6: ws.data.handler?.cancelTasks()
    },
  })
