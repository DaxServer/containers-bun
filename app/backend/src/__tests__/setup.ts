// Test environment setup — runs before all test files
// Provides a parseable DB_URL so mysql2 pool initializes without throwing
if (!Bun.env.DB_URL) {
  Bun.env.DB_URL = 'mysql://localhost/curator_test'
}
// Provides a valid 32-byte key so encryptAccessToken doesn't throw at import time
if (!Bun.env.TOKEN_ENCRYPTION_KEY) {
  Bun.env.TOKEN_ENCRYPTION_KEY = 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE'
}
