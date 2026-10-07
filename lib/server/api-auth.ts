import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

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

export async function authenticateRequest(request?: Request): Promise<AuthSuccess | AuthFailure> {
    try {
        // 1. Check NextAuth session via cookies
        const session = await auth()

        if (session?.user?.id) {
            const userId = session.user.id
            const role = ((session.user as any)?.role as string) ?? null

            return {
                ok: true,
                context: {
                    userId,
                    role,
                },
            }
        }

        // 2. Fallback: If no session cookie, check database directly if userId is available or return 401
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Authentication required. Please sign in.' },
                { status: 401 }
            ),
        }
    } catch (error) {
        console.error('authenticateRequest error:', error)
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Failed to authenticate request.' },
                { status: 500 }
            ),
        }
    }
}

export async function requireAdminRequest(request?: Request): Promise<AuthSuccess | AuthFailure> {
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
