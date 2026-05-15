import { config } from '@backend/config'
import * as schema from '@backend/db/schema'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'

const pool = mysql.createPool(config.dbUrl)
export const db = drizzle(pool, { schema, mode: 'default' })
export type DB = typeof db
