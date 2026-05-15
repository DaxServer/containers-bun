import { useWebSocket } from '@vueuse/core'

const toWs = (): string => {
  const origin = typeof location !== 'undefined' ? location.origin : 'http://localhost'
  return `${origin.replace('http', 'ws')}/ws`
}

export const useSocket = useWebSocket(toWs(), {
  immediate: false,
  autoReconnect: { retries: 5, delay: 1500 },
})
