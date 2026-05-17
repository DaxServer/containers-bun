import { createApp } from '@backend/app'
import { config } from '@backend/config'
import { logger } from '@backend/logger'
import { createUploadWorker } from '@backend/workers/upload.worker'
import { Redis } from 'ioredis'

const redis = new Redis(config.redisUrl)
const worker = createUploadWorker(redis)
worker.on('error', (err) => logger.error({ err }, 'Worker error'))

createApp().listen(config.port, () => {
  logger.info({ port: config.port }, 'curator-server listening')
})
