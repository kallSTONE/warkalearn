import { db } from './db'
import { sql } from 'drizzle-orm'

async function test() {
  const result = await db.execute(sql`
    SELECT current_database(), current_user
  `)

  console.log(result.rows)
}

test().catch(console.error)
