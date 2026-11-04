import { NextResponse } from 'next/server'
import { db } from '@/db'
import { referralSystemSettings } from '@/db/schema'
import { requireAdminRequest } from '@/lib/server/api-auth'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const [settings] = await db
      .select()
      .from(referralSystemSettings)
      .where(eq(referralSystemSettings.id, true))
      .limit(1)

    return NextResponse.json(
      {
        settings: settings
          ? {
              id: settings.id,
              is_active: settings.isActive,
              updated_at: settings.updatedAt?.toISOString() ?? null,
              updated_by: settings.updatedBy,
            }
          : {
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
    return NextResponse.json({ error: error?.message ?? 'Unable to load referral settings.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const body = await request.json()
    const nextActive = body?.isActive

    if (typeof nextActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean.' }, { status: 400 })
    }

    const [updated] = await db
      .insert(referralSystemSettings)
      .values({
        id: true,
        isActive: nextActive,
        updatedAt: new Date(),
        updatedBy: authResult.context.userId,
      })
      .onConflictDoUpdate({
        target: referralSystemSettings.id,
        set: {
          isActive: nextActive,
          updatedAt: new Date(),
          updatedBy: authResult.context.userId,
        },
      })
      .returning()

    return NextResponse.json(
      {
        success: true,
        settings: {
          id: updated.id,
          is_active: updated.isActive,
          updated_at: updated.updatedAt?.toISOString(),
          updated_by: updated.updatedBy,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Admin referral settings PATCH error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to update referral settings.' }, { status: 500 })
  }
}
