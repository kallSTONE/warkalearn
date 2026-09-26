import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { authenticateRequest } from '@/lib/server/api-auth'

const POINTS_PER_FREE_COURSE = 300

type ReferralProfileRow = {
    referral_points: number
    free_courses_awarded: number
}

export async function POST(request: Request) {
    const authResult = await authenticateRequest(request)

    if (!authResult.ok) {
        return authResult.response
    }

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

        const admin = getSupabaseAdminClient()
        const userId = authResult.context.userId

        const { data: requestedCourse, error: requestedCourseError } = await admin
            .from('courses')
            .select('id, is_paid, published, status')
            .eq('id', requestedCourseId)
            .maybeSingle<{
                id: number
                is_paid: boolean
                published: boolean | null
                status: string | null
            }>()

        if (requestedCourseError) {
            console.error('Requested course fetch error:', requestedCourseError)
            return NextResponse.json({ error: 'Unable to validate selected course.' }, { status: 500 })
        }

        const isPublished =
            Boolean(requestedCourse?.published) ||
            String(requestedCourse?.status ?? '').toLowerCase() === 'published'

        if (!requestedCourse || !requestedCourse.is_paid || !isPublished) {
            return NextResponse.json(
                { error: 'Selected course is not eligible for reward redemption.' },
                { status: 400 }
            )
        }

        const { data: profile, error: profileError } = await admin
            .from('referral_profiles')
            .select('referral_points, free_courses_awarded')
            .eq('user_id', userId)
            .maybeSingle<ReferralProfileRow>()

        if (profileError) {
            console.error('Referral profile read error:', profileError)
            return NextResponse.json({ error: 'Unable to validate referral profile.' }, { status: 500 })
        }

        if (!profile) {
            return NextResponse.json({ error: 'Referral profile not found.' }, { status: 404 })
        }

        const { data: existingPending, error: existingPendingError } = await admin
            .from('referral_reward_requests')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .limit(1)
            .maybeSingle()

        if (existingPendingError) {
            console.error('Pending reward check error:', existingPendingError)
            return NextResponse.json({ error: 'Unable to validate reward request status.' }, { status: 500 })
        }

        if (existingPending) {
            return NextResponse.json(
                { error: 'You already have a pending reward request.' },
                { status: 409 }
            )
        }

        const eligibleFreeCourses = Math.floor(profile.referral_points / POINTS_PER_FREE_COURSE)
        const availableFreeCoursesToRequest = Math.max(
            eligibleFreeCourses - profile.free_courses_awarded,
            0
        )

        if (availableFreeCoursesToRequest <= 0) {
            return NextResponse.json(
                { error: 'No eligible free courses available for request yet.' },
                { status: 400 }
            )
        }

        const { data: insertedRequest, error: insertError } = await admin
            .from('referral_reward_requests')
            .insert({
                user_id: userId,
                points_snapshot: profile.referral_points,
                free_courses_to_award: availableFreeCoursesToRequest,
                requested_course_id: requestedCourseId,
                status: 'pending',
            })
            .select('id, status, requested_at, free_courses_to_award, requested_course_id')
            .single()

        if (insertError) {
            console.error('Reward request insert error:', insertError)
            return NextResponse.json({ error: 'Unable to submit reward request.' }, { status: 500 })
        }

        return NextResponse.json(
            {
                success: true,
                request: insertedRequest,
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
