import { Redis } from 'ioredis'
import { createApp } from './app'
import { config } from './config'
import { createSessionPlugin } from './core/session'
import { createUploadWorker } from './workers/upload.worker'

const redis = new Redis(config.redisUrl)
const session = createSessionPlugin({
  async get(key) {
    return redis.get(key)
  },
  async set(key, value, ex, ttl) {
    await redis.set(key, value, ex, ttl)
  },
  async del(key) {
    await redis.del(key)
  },
})

const worker = createUploadWorker(redis)
worker.on('error', (err) => console.error('[worker] error:', err))

const app = createApp(session)
app.listen(config.port, () => {
  console.log(`curator-server listening on port ${config.port}`)
})
