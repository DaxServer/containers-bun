import { Redis } from 'ioredis'
import { createApp } from './app'
import { config } from './config'
import { createSessionPlugin } from './core/session'

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

const app = createApp(session)
app.listen(config.port, () => {
  console.log(`curator-server listening on port ${config.port}`)
})
