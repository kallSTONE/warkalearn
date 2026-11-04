import { NextResponse } from 'next/server'
import { db } from '@/db'
import { referralRewardCodes } from '@/db/schema'
import { authenticateRequest } from '@/lib/server/api-auth'
import { eq, and, desc, gt, isNull, or } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const userId = authResult.context.userId
    const now = new Date()

    const activeCodes = await db
      .select({
        id: referralRewardCodes.id,
        code: referralRewardCodes.code,
        status: referralRewardCodes.status,
        created_at: referralRewardCodes.createdAt,
        expires_at: referralRewardCodes.expiresAt,
        request_id: referralRewardCodes.requestId,
      })
      .from(referralRewardCodes)
      .where(
        and(
          eq(referralRewardCodes.userId, userId),
          eq(referralRewardCodes.status, 'active'),
          or(
            isNull(referralRewardCodes.expiresAt),
            gt(referralRewardCodes.expiresAt, now)
          )
        )
      )
      .orderBy(desc(referralRewardCodes.createdAt))

    return NextResponse.json(
      {
        codes: activeCodes.map((code) => ({
          id: code.id,
          code: code.code,
          status: code.status,
          created_at: code.created_at?.toISOString(),
          expires_at: code.expires_at?.toISOString() ?? null,
          request_id: code.request_id,
        })),
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Referral reward codes GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load reward codes.' }, { status: 500 })
  }
}
