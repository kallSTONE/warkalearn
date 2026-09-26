import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
    const authResult = await requireAdminRequest(request)

    if (!authResult.ok) {
        return authResult.response
    }

    try {
        const admin = getSupabaseAdminClient()

        const { data: settings, error } = await admin
            .from('referral_system_settings')
            .select('id, is_active, updated_at, updated_by')
            .eq('id', true)
            .maybeSingle()

        if (error) {
            console.error('Referral settings fetch error:', error)
            return NextResponse.json({ error: 'Unable to load referral settings.' }, { status: 500 })
        }

        return NextResponse.json(
            {
                settings: settings ?? {
                    id: true,
                    is_active: true,
                    updated_at: null,
                    updated_by: null,
                },
            },
            { status: 200 }
        )
    } catch (error: any) {
        console.error('Admin referral settings GET error:', error)
        return NextResponse.json(
            { error: error?.message ?? 'Unable to load referral settings.' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: Request) {
    const authResult = await requireAdminRequest(request)

    if (!authResult.ok) {
        return authResult.response
    }

    try {
        const body = await request.json()
        const nextActive = body?.isActive

        if (typeof nextActive !== 'boolean') {
            return NextResponse.json(
                { error: 'isActive must be a boolean.' },
                { status: 400 }
            )
        }

        const admin = getSupabaseAdminClient()

        const { data: updated, error } = await admin
            .from('referral_system_settings')
            .upsert(
                {
                    id: true,
                    is_active: nextActive,
                    updated_at: new Date().toISOString(),
                    updated_by: authResult.context.userId,
                },
                { onConflict: 'id' }
            )
            .select('id, is_active, updated_at, updated_by')
            .single()

        if (error) {
            console.error('Referral settings update error:', error)
            return NextResponse.json({ error: 'Unable to update referral settings.' }, { status: 500 })
        }

        return NextResponse.json({ success: true, settings: updated }, { status: 200 })
    } catch (error: any) {
        console.error('Admin referral settings PATCH error:', error)
        return NextResponse.json(
            { error: error?.message ?? 'Unable to update referral settings.' },
            { status: 500 }
        )
    }
}
