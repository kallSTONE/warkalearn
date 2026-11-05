import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { Pool } from 'pg'

async function main() {
  console.log('Connecting to PostgreSQL...')
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  const client = await pool.connect()
  try {
    console.log('Applying necessary schema additions...')
    await client.query(`
      ALTER TABLE IF EXISTS course_enrollments ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2) NOT NULL DEFAULT 0;
      ALTER TABLE IF EXISTS course_enrollments ADD COLUMN IF NOT EXISTS progress_id uuid;
      ALTER TABLE IF EXISTS courses ADD COLUMN IF NOT EXISTS price numeric(10,2);
      ALTER TABLE IF EXISTS courses ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;
      ALTER TABLE IF EXISTS profiles ALTER COLUMN role SET DEFAULT 'student';
      UPDATE profiles SET role = 'student' WHERE role = 'lawyer';
    `)
    console.log('Schema synchronized successfully!')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Schema sync failed:', err)
  process.exit(1)
})

