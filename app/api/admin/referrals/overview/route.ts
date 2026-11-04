import { NextResponse } from 'next/server'
import { db } from '@/db'
import {
  referralProfiles,
  profiles,
  referralInvites,
  referralRewardRequests,
  courses,
} from '@/db/schema'
import { requireAdminRequest } from '@/lib/server/api-auth'
import { desc, inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const REWARD_THRESHOLD = 300

export async function GET(request: Request) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const referralProfileRows = await db
      .select()
      .from(referralProfiles)
      .orderBy(desc(referralProfiles.referralPoints))

    if (referralProfileRows.length === 0) {
      return NextResponse.json(
        {
          totals: {
            totalReferrals: 0,
            activeReferrers: 0,
            totalPointsIssued: 0,
            totalRewardsClaimed: 0,
          },
          topReferrers: [],
          rewardRequests: [],
        },
        { status: 200 }
      )
    }

    const userIds = referralProfileRows.map((row) => row.userId)

    const [userProfiles, invites, rewardRequests] = await Promise.all([
      db
        .select({ id: profiles.id, fullName: profiles.fullName })
        .from(profiles)
        .where(inArray(profiles.id, userIds)),
      db
        .select({ referrerUserId: referralInvites.referrerUserId })
        .from(referralInvites)
        .where(inArray(referralInvites.referrerUserId, userIds)),
      db
        .select()
        .from(referralRewardRequests)
        .orderBy(desc(referralRewardRequests.requestedAt))
        .limit(20),
    ])

    const profileMap = new Map(userProfiles.map((p) => [p.id, p]))

    const inviteCountMap = new Map<string, number>()
    invites.forEach((invite) => {
      inviteCountMap.set(
        invite.referrerUserId,
        (inviteCountMap.get(invite.referrerUserId) ?? 0) + 1
      )
    })

    const totalReferrals = invites.length
    const activeReferrers = referralProfileRows.filter((p) => p.referralPoints > 0).length
    const totalPointsIssued = referralProfileRows.reduce((sum, p) => sum + p.referralPoints, 0)
    const totalRewardsClaimed = referralProfileRows.reduce(
      (sum, p) => sum + p.freeCoursesAwarded,
      0
    )

    const topReferrers = referralProfileRows.slice(0, 10).map((row) => {
      const profile = profileMap.get(row.userId)
      return {
        id: row.userId,
        fullName: profile?.fullName ?? null,
        referralPoints: row.referralPoints,
        successfulInvites: inviteCountMap.get(row.userId) ?? row.successfulInvites,
        freeCoursesAwarded: row.freeCoursesAwarded,
        eligibleRewardTiers: Math.floor(row.referralPoints / REWARD_THRESHOLD),
        lastActivity: row.updatedAt?.toISOString(),
      }
    })

    const formattedRewardRequests = rewardRequests.map((req) => {
      const profile = profileMap.get(req.userId)
      return {
        id: req.id,
        userId: req.userId,
        fullName: profile?.fullName ?? null,
        status: req.status,
        requestedAt: req.requestedAt?.toISOString(),
        freeCoursesToAward: req.freeCoursesToAward,
        adminNote: req.adminNote,
      }
    })

    return NextResponse.json(
      {
        totals: {
          totalReferrals,
          activeReferrers,
          totalPointsIssued,
          totalRewardsClaimed,
        },
        topReferrers,
        rewardRequests: formattedRewardRequests,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Admin referrals overview GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load overview.' }, { status: 500 })
  }
}
