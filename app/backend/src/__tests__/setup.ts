// Test environment setup — runs before all test files
// Provides a parseable DB_URL so mysql2 pool initializes without throwing
if (!Bun.env.DB_URL) {
  process.env.DB_URL = 'mysql://localhost/curator_test'
}
