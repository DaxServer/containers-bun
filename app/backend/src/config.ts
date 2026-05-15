const redisHost = process.env.REDIS_HOST ?? "localhost";
const redisPort = parseInt(process.env.REDIS_PORT ?? "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD;
const redisUrl = redisPassword
  ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
  : `redis://${redisHost}:${redisPort}`;

export const config = {
  port: parseInt(process.env.PORT ?? "8000", 10),
  oauthKey: process.env.CURATOR_OAUTH1_KEY ?? "",
  oauthSecret: process.env.CURATOR_OAUTH1_SECRET ?? "",
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY ?? "",
  sessionSecretKey: process.env.SESSION_SECRET_KEY ?? "",
  wcqsOauthToken: process.env.WCQS_OAUTH_TOKEN ?? "WCQS_OAUTH_TOKEN",
  mapillaryApiToken: process.env.MAPILLARY_API_TOKEN ?? "MAPILLARY_API_TOKEN",
  redisUrl,
  dbUrl: process.env.DB_URL ?? "",
  workerConcurrency: parseInt(process.env.CELERY_CONCURRENCY ?? "2", 10),
  workerMaxWaitTime: parseInt(process.env.CELERY_MAXIMUM_WAIT_TIME ?? "240", 10),
  rateLimitNormal: parseInt(process.env.RATE_LIMIT_DEFAULT_NORMAL ?? "4", 10),
  rateLimitPeriod: parseInt(process.env.RATE_LIMIT_DEFAULT_PERIOD ?? "60", 10),
  geocodingApiUrl:
    process.env.GEOCODING_API_URL ?? "https://geocoding.daxserver.com/reverse",
  geocodingConcurrencyLimit: parseInt(
    process.env.GEOCODING_CONCURRENCY_LIMIT ?? "10",
    10,
  ),
  userAgent:
    "Curator / Toolforge curator.toolforge.org / Wikimedia Commons User:DaxServer",
  wikimediaUrls: {
    indexUrl: "https://commons.wikimedia.org/w/index.php",
    baseUrl: "https://commons.wikimedia.org/w/api.php",
    authorizeUrl: "https://commons.wikimedia.org/w/rest.php/oauth2/authorize",
    accessTokenUrl:
      "https://commons.wikimedia.org/w/rest.php/oauth2/access_token",
    profileUrl: "https://commons.wikimedia.org/w/rest.php/oauth2/resource/profile",
  },
} as const;
