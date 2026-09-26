import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'

type AuthContext = {
    userId: string
    role: string | null
}

type AuthSuccess = {
    ok: true
    context: AuthContext
}

type AuthFailure = {
    ok: false
    response: NextResponse
}

function getBearerToken(request: Request): string | null {
    const authorization = request.headers.get('authorization')
    if (!authorization) return null

    const [scheme, token] = authorization.split(' ')
    if (!scheme || !token) return null

    if (scheme.toLowerCase() !== 'bearer') {
        return null
    }

    return token.trim() || null
}

export async function authenticateRequest(request: Request): Promise<AuthSuccess | AuthFailure> {
    const token = getBearerToken(request)

    if (!token) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Missing bearer token.' },
                { status: 401 }
            ),
        }
    }

    const admin = getSupabaseAdminClient()
    const { data: userData, error: userError } = await admin.auth.getUser(token)

    if (userError || !userData.user) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Invalid or expired session.' },
                { status: 401 }
            ),
        }
    }

    const userId = userData.user.id

    const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle<{ role: string | null }>()

    if (profileError) {
        console.error('Failed to read profile role:', profileError)
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Unable to validate user role.' },
                { status: 500 }
            ),
        }
    }

    return {
        ok: true,
        context: {
            userId,
            role: profile?.role ?? null,
        },
    }
}

export async function requireAdminRequest(request: Request): Promise<AuthSuccess | AuthFailure> {
    const authResult = await authenticateRequest(request)

    if (!authResult.ok) {
        return authResult
    }

    if ((authResult.context.role ?? '').toLowerCase() !== 'admin') {
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Admin access required.' },
                { status: 403 }
            ),
        }
    }

    return authResult
}
