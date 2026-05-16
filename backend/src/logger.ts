import pino from 'pino'

const isProd = !!Bun.env.TOOL_DATA_DIR

export const logger = pino({
  level: Bun.env.LOG_LEVEL ?? 'info',
  transport: isProd ? undefined : { target: 'pino-pretty' },
})

export const workerLogger = logger.child({ module: 'worker' })
export const wsLogger = logger.child({ module: 'ws' })
export const mapillaryLogger = logger.child({ module: 'mapillary' })
