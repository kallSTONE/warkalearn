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

let schemaSynced = false
export async function ensureSchemaSynced() {
  if (schemaSynced) return
  try {
    const client = await pool.connect()
    try {
      await client.query(`
        ALTER TABLE IF EXISTS course_enrollments ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2) NOT NULL DEFAULT 0;
        ALTER TABLE IF EXISTS course_enrollments ADD COLUMN IF NOT EXISTS progress_id uuid;
        ALTER TABLE IF EXISTS courses ADD COLUMN IF NOT EXISTS price numeric(10,2);
        ALTER TABLE IF EXISTS courses ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;
        ALTER TABLE IF EXISTS profiles ALTER COLUMN role SET DEFAULT 'student';
        UPDATE profiles SET role = 'student' WHERE role = 'lawyer';
      `)
      schemaSynced = true
    } finally {
      client.release()
    }
  } catch (err: any) {
    // If database is starting up or temporarily unavailable, allow retry
    schemaSynced = false
  }
}

// Initial fire-and-forget sync
void ensureSchemaSynced()

// Pass schema so db.query.tableName.findFirst() works
export const db = drizzle(pool, { schema })

// Re-export schema for convenience in other files
export { schema }
