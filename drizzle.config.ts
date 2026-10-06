import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

dotenv.config({ path: '.env.local' })
dotenv.config()

export default defineConfig({
  // Where your schema lives
  schema: './db/schema.ts',

  // Where drizzle-kit will write generated migration SQL files
  out: './db/migrations',

  dialect: 'postgresql',

  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },

  // Print every SQL statement drizzle-kit runs — useful for learning
  verbose: true,

  // Strict mode: drizzle-kit will ask before dropping columns/tables
  strict: true,
})
