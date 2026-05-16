// Test environment setup — runs before all test files
// Provides a parseable DB_URL so mysql2 pool initializes without throwing
Bun.env.DB_URL ??= 'mysql://localhost/curator_test'
// Fernet-scheme key (32 bytes base64url). Set unconditionally so config.ts
// always sees it regardless of worker isolation or preload timing in Bun 1.3.
Bun.env.TOKEN_ENCRYPTION_KEY = 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE'
