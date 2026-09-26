import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''
r
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase public credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
}

let parsedSupabaseUrl: URL

try {
    parsedSupabaseUrl = new URL(supabaseUrl)
} catch {
    throw new Error(
        'Invalid NEXT_PUBLIC_SUPABASE_URL. Expected a full URL like https://<project-ref>.supabase.co.'
    )
}

if (parsedSupabaseUrl.hostname === 'api.supabase.com') {
    throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL must be your project URL (https://<project-ref>.supabase.co), not api.supabase.com.'
    )
}

// This creates a singleton instance of the Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export default supabase