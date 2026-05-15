declare module "bun" {
  interface Env {
    PORT?: number
    REDIS_HOST?: string
    REDIS_PORT?: number
    REDIS_PASSWORD?: string
    CURATOR_OAUTH1_KEY?: string
    CURATOR_OAUTH1_SECRET?: string
    TOKEN_ENCRYPTION_KEY?: string
    SESSION_SECRET_KEY?: string
    WCQS_OAUTH_TOKEN?: string
    MAPILLARY_API_TOKEN?: string
    DB_URL?: string
    CELERY_CONCURRENCY?: number
    CELERY_MAXIMUM_WAIT_TIME?: number
    RATE_LIMIT_DEFAULT_NORMAL?: number
    RATE_LIMIT_DEFAULT_PERIOD?: number
    GEOCODING_API_URL?: string
    GEOCODING_CONCURRENCY_LIMIT?: number
    STATIC_DIR?: string
  }
}
