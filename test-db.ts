import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()
import { db } from './db'
import { sql } from 'drizzle-orm'

async function testDatabase() {
  const result = await db.execute(sql`SELECT version()`)

  console.log('PostgreSQL connection successful!')
  console.log(result.rows[0])
}

testDatabase().catch((error) => {
  console.error('PostgreSQL connection failed:')
  console.error(error)
  process.exit(1)
})
