import type { App } from '@backend/app'
import type { ClientMessage, ServerMessage } from '@backend/types/ws'
import { treaty } from '@elysiajs/eden'
import { ref } from 'vue'

const getOrigin = () =>
  typeof location !== 'undefined' ? location.origin : 'http://localhost:8000'

const data = ref<ServerMessage | null>(null)
let _ws: ReturnType<ReturnType<typeof treaty<App>>['ws']['subscribe']> | null = null
let _ready = false
const _queue: ClientMessage[] = []

const open = () => {
  if (_ws) close()
  _ready = false
  const client = treaty<App>(getOrigin())
  _ws = client.ws.subscribe()
  _ws.on('open', () => {
    _ready = true
    for (const msg of _queue.splice(0)) _ws?.send(msg)
  })
  _ws.subscribe((event) => {
    data.value = event.data
  })
}

const send = (msg: ClientMessage) => {
  if (!_ws) return
  if (!_ready) {
    _queue.push(msg)
    return
  }
  _ws.send(msg)
}

const close = () => {
  _ready = false
  _queue.length = 0
  _ws?.close()
}

export const useSocket = { data, open, send, close }
