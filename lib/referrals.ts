import { db } from '@/db'
import {
  referralSystemSettings,
  referralProfiles,
  referralInvites,
  referralRewardRequests,
  referralRewardActivations,
  referralRewardCodes,
  courses,
  courseEnrollments,
  courseProgress,
} from '@/db/schema'
import { eq, sql, desc, and } from 'drizzle-orm'

export const POINTS_PER_FREE_COURSE = 300

export async function claimReferralInvite({
  referredUserId,
  referralCode,
  points = 100,
}: {
  referredUserId: string
  referralCode: string
  points?: number
}) {
  return await db.transaction(async (tx) => {
    // 1. Check system active
    const [settings] = await tx
      .select()
      .from(referralSystemSettings)
      .where(eq(referralSystemSettings.id, true))
      .limit(1)

    if (settings && !settings.isActive) {
      return { status: 'system_inactive', referrer_user_id: null }
    }

    // 2. Check if already claimed
    const [existing] = await tx
      .select()
      .from(referralInvites)
      .where(eq(referralInvites.referredUserId, referredUserId))
      .limit(1)

    if (existing) {
      return { status: 'already_claimed', referrer_user_id: existing.referrerUserId }
    }

    // 3. Find referrer profile
    const normalizedCode = referralCode.trim().toUpperCase()
    const [referrer] = await tx
      .select()
      .from(referralProfiles)
      .where(sql`upper(${referralProfiles.referralCode}) = ${normalizedCode}`)
      .limit(1)

    if (!referrer) {
      return { status: 'invalid_code', referrer_user_id: null }
    }

    if (referrer.userId === referredUserId) {
      return { status: 'self_referral', referrer_user_id: referrer.userId }
    }

    // 4. Insert invite
    const [invite] = await tx
      .insert(referralInvites)
      .values({
        referrerUserId: referrer.userId,
        referredUserId,
        referralCodeUsed: normalizedCode,
        pointsAwarded: points,
        status: 'qualified',
      })
      .onConflictDoNothing()
      .returning()

    if (!invite) {
      return { status: 'already_claimed', referrer_user_id: referrer.userId }
    }

    // 5. Update referrer points and successful invites
    await tx
      .update(referralProfiles)
      .set({
        referralPoints: sql`${referralProfiles.referralPoints} + ${points}`,
        successfulInvites: sql`${referralProfiles.successfulInvites} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(referralProfiles.userId, referrer.userId))

    return { status: 'claimed', referrer_user_id: referrer.userId }
  })
}

export async function redeemReferralRewardCode({
  userId,
  code,
  courseId,
}: {
  userId: string
  code: string
  courseId: number
}) {
  return await db.transaction(async (tx) => {
    // 1. Verify course
    const [course] = await tx
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1)

    if (!course) {
      return { status: 'course_not_found', enrollment_id: null, reward_code_id: null }
    }

    // 2. Find code
    const normalizedCode = code.trim().toUpperCase()
    const [rewardCode] = await tx
      .select()
      .from(referralRewardCodes)
      .where(sql`upper(${referralRewardCodes.code}) = ${normalizedCode}`)
      .limit(1)

    if (!rewardCode) {
      return { status: 'invalid_code', enrollment_id: null, reward_code_id: null }
    }

    if (rewardCode.userId !== userId) {
      return { status: 'not_owner', enrollment_id: null, reward_code_id: rewardCode.id }
    }

    if (rewardCode.status !== 'active') {
      return { status: 'code_not_active', enrollment_id: null, reward_code_id: rewardCode.id }
    }

    if (rewardCode.expiresAt && rewardCode.expiresAt < new Date()) {
      await tx
        .update(referralRewardCodes)
        .set({ status: 'expired' })
        .where(eq(referralRewardCodes.id, rewardCode.id))

      return { status: 'code_expired', enrollment_id: null, reward_code_id: rewardCode.id }
    }

    // 3. Check existing enrollment
    const [existingEnrollment] = await tx
      .select()
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.userId, userId),
          eq(courseEnrollments.courseId, courseId)
        )
      )
      .limit(1)

    if (existingEnrollment) {
      return {
        status: 'already_enrolled',
        enrollment_id: existingEnrollment.id,
        reward_code_id: rewardCode.id,
      }
    }

    // 4. Enroll for free
    const [newEnrollment] = await tx
      .insert(courseEnrollments)
      .values({
        userId,
        courseId,
        amountPaid: '0.00',
      })
      .returning()

    // 5. Initialize course progress
    await tx
      .insert(courseProgress)
      .values({
        enrollmentId: newEnrollment.id,
        progressPercentage: 0,
        completed: false,
      })
      .onConflictDoNothing()

    // 6. Update code status to used
    await tx
      .update(referralRewardCodes)
      .set({
        status: 'used',
        usedAt: new Date(),
        usedByUserId: userId,
        usedForCourseId: courseId,
      })
      .where(eq(referralRewardCodes.id, rewardCode.id))

    return {
      status: 'redeemed',
      enrollment_id: newEnrollment.id,
      reward_code_id: rewardCode.id,
    }
  })
}

