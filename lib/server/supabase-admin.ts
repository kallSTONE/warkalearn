import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

export function getSupabaseAdminClient() {
    if (!supabaseUrl || !supabaseServiceRole) {
        throw new Error(
            'Missing Supabase admin credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        )
    }

    return createClient(supabaseUrl, supabaseServiceRole, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    })
}
