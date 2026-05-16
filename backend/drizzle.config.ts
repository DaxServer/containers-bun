import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DB_URL ?? (() => { throw new Error('DB_URL is required for drizzle-kit') })(),
  },
})
