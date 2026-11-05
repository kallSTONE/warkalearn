import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NDA5OTYsImV4cCI6MjA4MDExNjk5Nn0.placeholder'

// Fallback client for backward compatibility with components migrating off Supabase
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export default supabase
