import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const REWARD_THRESHOLD = 300

type ReferralProfileRow = {
    user_id: string
    referral_points: number
    successful_invites: number
    free_courses_awarded: number
    updated_at: string
}

type ProfileRow = {
    id: string
    full_name: string | null
}

type RewardRequestRow = {
    id: string
    user_id: string
    status: string
    requested_at: string
    requested_course_id: number | null
    admin_note: string | null
}

type CourseTitleRow = {
    id: number
    title: string
}

type InviteCountRow = {
    referrer_user_id: string
}

export async function GET(request: Request) {
    const authResult = await requireAdminRequest(request)

    if (!authResult.ok) {
        return authResult.response
    }

    try {
        const admin = getSupabaseAdminClient()

        const { data: referralProfiles, error: referralProfilesError } = await admin
            .from('referral_profiles')
            .select('user_id, referral_points, successful_invites, free_courses_awarded, updated_at')
            .order('referral_points', { ascending: false })
            .returns<ReferralProfileRow[]>()

        if (referralProfilesError) {
            console.error('Referral profiles query error:', referralProfilesError)
            return NextResponse.json({ error: 'Unable to load referral profiles.' }, { status: 500 })
        }

        const userIds = (referralProfiles ?? []).map((row) => row.user_id)

        const { data: profiles, error: profilesError } = await admin
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])
            .returns<ProfileRow[]>()

        if (profilesError) {
            console.error('Profiles query error:', profilesError)
            return NextResponse.json({ error: 'Unable to load profile data.' }, { status: 500 })
        }

        const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

        const { data: qualifiedInvites, error: qualifiedInvitesError } = await admin
            .from('referral_invites')
            .select('referrer_user_id')
            .eq('status', 'qualified')
            .in(
                'referrer_user_id',
                userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']
            )
            .returns<InviteCountRow[]>()

        if (qualifiedInvitesError) {
            console.error('Qualified invites query error:', qualifiedInvitesError)
            return NextResponse.json({ error: 'Unable to load invite counts.' }, { status: 500 })
        }

        const inviteCountByReferrer = new Map<string, number>()
        for (const inviteRow of qualifiedInvites ?? []) {
            const nextCount = (inviteCountByReferrer.get(inviteRow.referrer_user_id) ?? 0) + 1
            inviteCountByReferrer.set(inviteRow.referrer_user_id, nextCount)
        }

        const { data: pendingRewardRequests, error: pendingRewardRequestsError } = await admin
            .from('referral_reward_requests')
            .select('id, user_id, status, requested_at, requested_course_id, admin_note')
            .eq('status', 'pending')
            .order('requested_at', { ascending: false })
            .returns<RewardRequestRow[]>()

        if (pendingRewardRequestsError) {
            console.error('Pending reward requests query error:', pendingRewardRequestsError)
            return NextResponse.json({ error: 'Unable to load pending reward requests.' }, { status: 500 })
        }

        const pendingByUser = new Map<string, RewardRequestRow>()
        for (const requestRow of pendingRewardRequests ?? []) {
            if (!pendingByUser.has(requestRow.user_id)) {
                pendingByUser.set(requestRow.user_id, requestRow)
            }
        }

        const requestedCourseIds = Array.from(
            new Set(
                (pendingRewardRequests ?? [])
                    .map((row) => row.requested_course_id)
                    .filter((courseId): courseId is number => typeof courseId === 'number')
            )
        )

        const { data: requestedCourses, error: requestedCoursesError } = await admin
            .from('courses')
            .select('id, title')
            .in('id', requestedCourseIds.length > 0 ? requestedCourseIds : [-1])
            .returns<CourseTitleRow[]>()

        if (requestedCoursesError) {
            console.error('Requested courses query error:', requestedCoursesError)
            return NextResponse.json({ error: 'Unable to load requested course data.' }, { status: 500 })
        }

        const courseTitleById = new Map((requestedCourses ?? []).map((course) => [course.id, course.title]))

        const students = (referralProfiles ?? []).map((row) => {
            const profile = profileMap.get(row.user_id)
            const pendingRequest = pendingByUser.get(row.user_id)
            const eligibleFreeCourses = Math.floor(row.referral_points / REWARD_THRESHOLD)
            const hasPendingRequest = Boolean(pendingRequest)

            return {
                id: row.user_id,
                fullName: profile?.full_name ?? 'Unknown user',
                referralPoints: row.referral_points,
                successfulInvites:
                    inviteCountByReferrer.get(row.user_id) ?? row.successful_invites,
                freeCoursesAwarded: row.free_courses_awarded,
                rewarded: row.free_courses_awarded > 0,
                isEligiblePending: eligibleFreeCourses > row.free_courses_awarded && !hasPendingRequest,
                hasPendingRequest,
                latestRequestId: pendingRequest?.id ?? null,
                latestRequestedCourseId: pendingRequest?.requested_course_id ?? null,
                latestRequestedCourseTitle:
                    typeof pendingRequest?.requested_course_id === 'number'
                        ? courseTitleById.get(pendingRequest.requested_course_id) ?? null
                        : null,
                latestRequestAdminNote: pendingRequest?.admin_note ?? null,
                lastRewardedAt: row.updated_at,
            }
        })

        const studentsWithPoints = students.filter((student) => student.referralPoints > 0)

        return NextResponse.json(
            {
                metrics: {
                    studentsWithPoints: studentsWithPoints.length,
                    totalPointsIssued: studentsWithPoints.reduce(
                        (sum, student) => sum + student.referralPoints,
                        0
                    ),
                    studentsRewarded: studentsWithPoints.filter((student) => student.rewarded).length,
                    pendingRewards: studentsWithPoints.filter(
                        (student) => student.isEligiblePending || student.hasPendingRequest
                    ).length,
                },
                students: studentsWithPoints,
            },
            { status: 200 }
        )
    } catch (error: any) {
        console.error('Admin referral overview API error:', error)
        return NextResponse.json(
            { error: error?.message ?? 'Unable to load referral overview.' },
            { status: 500 }
        )
    }
}
