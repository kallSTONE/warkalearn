import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Please check your .env.local file.')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Pass schema so db.query.tableName.findFirst() works
export const db = drizzle(pool, { schema })

// Re-export schema for convenience in other files
export { schema }
