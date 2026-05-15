import { ref } from 'vue'
import { treaty } from '@elysiajs/eden'
import type { App } from '@backend/app'
import type { ClientMessage, ServerMessage } from '@backend/types/ws'

const getOrigin = () =>
  typeof location !== 'undefined' ? location.origin : 'http://localhost:8000'

const data = ref<ServerMessage | null>(null)
let _ws: ReturnType<ReturnType<typeof treaty<App>>['ws']['subscribe']> | null = null

const open = () => {
  const client = treaty<App>(getOrigin())
  _ws = client.ws.subscribe()
  _ws.on('message', (event) => {
    data.value = event.data as ServerMessage
  })
}

const send = (msg: ClientMessage) => _ws?.send(msg)
const close = () => _ws?.close()

export const useSocket = { data, open, send, close }
