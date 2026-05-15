import { config } from '@backend/config'
import * as schema from '@backend/db/schema'
import { drizzle } from 'drizzle-orm/mysql2'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'

let _db: MySql2Database<typeof schema> | undefined

function getDb(): MySql2Database<typeof schema> {
  if (!_db) {
    const pool = mysql.createPool(config.dbUrl)
    _db = drizzle(pool, { schema, mode: 'default' })
  }
  return _db
}

export const db = new Proxy({} as MySql2Database<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  },
})
export type DB = MySql2Database<typeof schema>
