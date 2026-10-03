import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Pass schema so db.query.tableName.findFirst() works
export const db = drizzle(pool, { schema })

// Re-export schema for convenience in other files
export { schema }
