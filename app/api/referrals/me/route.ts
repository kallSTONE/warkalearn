import { NextResponse } from 'next/server'
import { db } from '@/db'
import { referralProfiles, referralInvites, referralRewardRequests } from '@/db/schema'
import { authenticateRequest } from '@/lib/server/api-auth'
import { eq, desc, and } from 'drizzle-orm'
import { POINTS_PER_FREE_COURSE } from '@/lib/referrals'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const userId = authResult.context.userId

    const [referralProfile] = await db
      .select()
      .from(referralProfiles)
      .where(eq(referralProfiles.userId, userId))
      .limit(1)

    if (!referralProfile) {
      return NextResponse.json(
        {
          referralCode: null,
          referralPoints: 0,
          successfulInvites: 0,
          freeCoursesAwarded: 0,
          eligibleFreeCourses: 0,
          availableFreeCoursesToRequest: 0,
          pointsToNextReward: POINTS_PER_FREE_COURSE,
          recentInvites: [],
          latestRewardRequest: null,
        },
        { status: 200 }
      )
    }

    const [inviteStats, recentInvitesRows, [latestRewardRequest]] = await Promise.all([
      db
        .select({ pointsAwarded: referralInvites.pointsAwarded })
        .from(referralInvites)
        .where(
          and(
            eq(referralInvites.referrerUserId, userId),
            eq(referralInvites.status, 'qualified')
          )
        ),
      db
        .select()
        .from(referralInvites)
        .where(eq(referralInvites.referrerUserId, userId))
        .orderBy(desc(referralInvites.createdAt))
        .limit(10),
      db
        .select()
        .from(referralRewardRequests)
        .where(eq(referralRewardRequests.userId, userId))
        .orderBy(desc(referralRewardRequests.requestedAt))
        .limit(1),
    ])

    const referralPointsFromInvites = inviteStats.reduce(
      (sum, invite) => sum + (invite.pointsAwarded ?? 0),
      0
    )

    const referralPoints = Math.max(referralPointsFromInvites, referralProfile.referralPoints)
    const successfulInvites = inviteStats.length
    const eligibleFreeCourses = Math.floor(referralPoints / POINTS_PER_FREE_COURSE)
    const availableFreeCoursesToRequest = Math.max(
      eligibleFreeCourses - referralProfile.freeCoursesAwarded,
      0
    )
    const pointsInCurrentTier = referralPoints % POINTS_PER_FREE_COURSE
    const pointsToNextReward =
      pointsInCurrentTier === 0 && referralPoints > 0
        ? 0
        : POINTS_PER_FREE_COURSE - pointsInCurrentTier

    return NextResponse.json(
      {
        referralCode: referralProfile.referralCode,
        referralPoints,
        successfulInvites,
        freeCoursesAwarded: referralProfile.freeCoursesAwarded,
        eligibleFreeCourses,
        availableFreeCoursesToRequest,
        pointsToNextReward,
        recentInvites: recentInvitesRows.map((inv) => ({
          id: inv.id,
          referred_user_id: inv.referredUserId,
          referral_code_used: inv.referralCodeUsed,
          points_awarded: inv.pointsAwarded,
          status: inv.status,
          created_at: inv.createdAt?.toISOString(),
        })),
        latestRewardRequest: latestRewardRequest
          ? {
              id: latestRewardRequest.id,
              status: latestRewardRequest.status,
              requested_at: latestRewardRequest.requestedAt?.toISOString(),
              free_courses_to_award: latestRewardRequest.freeCoursesToAward,
              admin_note: latestRewardRequest.adminNote,
            }
          : null,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Referrals me API error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Unable to load referral data.' },
      { status: 500 }
    )
  }
}
