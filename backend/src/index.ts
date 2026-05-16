import { createApp } from '@backend/app'
import { config } from '@backend/config'
import { createSessionPlugin } from '@backend/core/session'
import { logger } from '@backend/logger'
import { createUploadWorker } from '@backend/workers/upload.worker'
import { Redis } from 'ioredis'

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
worker.on('error', (err) => logger.error({ err }, 'Worker error'))

const app = createApp(session, redis)
app.listen(config.port, () => {
  logger.info({ port: config.port }, 'curator-server listening')
})
