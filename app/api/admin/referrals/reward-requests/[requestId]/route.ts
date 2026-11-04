import { NextResponse } from 'next/server'
import { db } from '@/db'
import {
  referralRewardRequests,
  referralRewardActivations,
  referralRewardCodes,
  referralProfiles,
} from '@/db/schema'
import { requireAdminRequest } from '@/lib/server/api-auth'
import { eq, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function buildRewardCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const randomChunk = Array.from({ length: 10 })
    .map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
    .join('')

  return `RW-${randomChunk}`
}

export async function PATCH(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const requestId = decodeURIComponent(params.requestId || '').trim()
    if (!isUuid(requestId)) {
      return NextResponse.json({ error: 'Invalid request id.' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const action = typeof body?.action === 'string' ? body.action.trim().toLowerCase() : ''
    const adminNote = typeof body?.adminNote === 'string' ? body.adminNote.trim() : null

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: "action must be either 'approve' or 'reject'." },
        { status: 400 }
      )
    }

    const adminUserId = authResult.context.userId

    const result = await db.transaction(async (tx) => {
      const [rewardRequest] = await tx
        .select()
        .from(referralRewardRequests)
        .where(eq(referralRewardRequests.id, requestId))
        .limit(1)

      if (!rewardRequest) {
        throw new Error('Reward request not found.')
      }

      if (rewardRequest.status !== 'pending') {
        throw new Error(`Reward request is already ${rewardRequest.status}.`)
      }

      if (action === 'reject') {
        const [rejected] = await tx
          .update(referralRewardRequests)
          .set({
            status: 'rejected',
            adminNote,
            handledAt: new Date(),
            handledBy: adminUserId,
          })
          .where(eq(referralRewardRequests.id, requestId))
          .returning()

        return { action: 'rejected', request: rejected, codes: [] }
      }

      // Approve flow
      const codeCount = Math.max(1, rewardRequest.freeCoursesToAward)
      const createdCodes: string[] = []

      for (let i = 0; i < codeCount; i++) {
        const code = buildRewardCode()
        await tx.insert(referralRewardCodes).values({
          requestId,
          userId: rewardRequest.userId,
          code,
          status: 'active',
          createdBy: adminUserId,
        })
        createdCodes.push(code)
      }

      await tx.insert(referralRewardActivations).values({
        requestId,
        userId: rewardRequest.userId,
        freeCoursesAwarded: codeCount,
        activatedBy: adminUserId,
      })

      await tx
        .update(referralProfiles)
        .set({
          freeCoursesAwarded: sql`${referralProfiles.freeCoursesAwarded} + ${codeCount}`,
          updatedAt: new Date(),
        })
        .where(eq(referralProfiles.userId, rewardRequest.userId))

      const [approved] = await tx
        .update(referralRewardRequests)
        .set({
          status: 'activated',
          adminNote,
          handledAt: new Date(),
          handledBy: adminUserId,
        })
        .where(eq(referralRewardRequests.id, requestId))
        .returning()

      return { action: 'approved', request: approved, codes: createdCodes }
    })

    return NextResponse.json(
      {
        success: true,
        action: result.action,
        request: result.request,
        codes: result.codes,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Admin referral reward-request PATCH error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to update reward request.' }, { status: 500 })
  }
}
