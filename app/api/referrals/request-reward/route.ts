import { NextResponse } from 'next/server'
import { db } from '@/db'
import { courses, referralProfiles, referralRewardRequests } from '@/db/schema'
import { authenticateRequest } from '@/lib/server/api-auth'
import { eq, and } from 'drizzle-orm'
import { POINTS_PER_FREE_COURSE } from '@/lib/referrals'

export async function POST(request: Request) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const body = await request.json().catch(() => ({}))
    const requestedCourseIdRaw = body?.courseId
    const requestedCourseId =
      typeof requestedCourseIdRaw === 'number'
        ? requestedCourseIdRaw
        : Number(requestedCourseIdRaw)

    if (!Number.isFinite(requestedCourseId)) {
      return NextResponse.json(
        { error: 'Please select a course for this reward request.' },
        { status: 400 }
      )
    }

    const userId = authResult.context.userId

    // 1. Validate requested course
    const [requestedCourse] = await db
      .select({
        id: courses.id,
        isPaid: courses.isPaid,
        published: courses.published,
        status: courses.status,
      })
      .from(courses)
      .where(eq(courses.id, requestedCourseId))
      .limit(1)

    const isPublished =
      Boolean(requestedCourse?.published) ||
      String(requestedCourse?.status ?? '').toLowerCase() === 'published'

    if (!requestedCourse || !requestedCourse.isPaid || !isPublished) {
      return NextResponse.json(
        { error: 'Selected course is not eligible for reward redemption.' },
        { status: 400 }
      )
    }

    // 2. Validate referral profile
    const [profile] = await db
      .select()
      .from(referralProfiles)
      .where(eq(referralProfiles.userId, userId))
      .limit(1)

    if (!profile) {
      return NextResponse.json({ error: 'Referral profile not found.' }, { status: 404 })
    }

    // 3. Check existing pending request
    const [existingPending] = await db
      .select()
      .from(referralRewardRequests)
      .where(
        and(
          eq(referralRewardRequests.userId, userId),
          eq(referralRewardRequests.status, 'pending')
        )
      )
      .limit(1)

    if (existingPending) {
      return NextResponse.json(
        { error: 'You already have a pending reward request.' },
        { status: 409 }
      )
    }

    const eligibleFreeCourses = Math.floor(profile.referralPoints / POINTS_PER_FREE_COURSE)
    const availableFreeCoursesToRequest = Math.max(
      eligibleFreeCourses - profile.freeCoursesAwarded,
      0
    )

    if (availableFreeCoursesToRequest <= 0) {
      return NextResponse.json(
        { error: 'No eligible free courses available for request yet.' },
        { status: 400 }
      )
    }

    const [insertedRequest] = await db
      .insert(referralRewardRequests)
      .values({
        userId,
        pointsSnapshot: profile.referralPoints,
        freeCoursesToAward: availableFreeCoursesToRequest,
        status: 'pending',
      })
      .returning()

    return NextResponse.json(
      {
        success: true,
        request: {
          id: insertedRequest.id,
          status: insertedRequest.status,
          requested_at: insertedRequest.requestedAt?.toISOString(),
          free_courses_to_award: insertedRequest.freeCoursesToAward,
          requested_course_id: requestedCourseId,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Referral request-reward API error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Unable to submit reward request.' },
      { status: 500 }
    )
  }
}
