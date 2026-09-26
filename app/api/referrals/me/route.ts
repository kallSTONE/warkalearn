import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { authenticateRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const POINTS_PER_FREE_COURSE = 300

type ReferralProfileRow = {
    user_id: string
    referral_code: string
    referral_points: number
    successful_invites: number
    free_courses_awarded: number
}

type RewardRequestRow = {
    id: string
    status: string
    requested_at: string
    free_courses_to_award: number
    requested_course_id: number | null
    admin_note: string | null
}

type InviteStatsRow = {
    points_awarded: number
}

export async function GET(request: Request) {
    const authResult = await authenticateRequest(request)

    if (!authResult.ok) {
        return authResult.response
    }

    try {
        const admin = getSupabaseAdminClient()
        const userId = authResult.context.userId

        const { data: referralProfile, error: profileError } = await admin
            .from('referral_profiles')
            .select('user_id, referral_code, referral_points, successful_invites, free_courses_awarded')
            .eq('user_id', userId)
            .maybeSingle<ReferralProfileRow>()

        if (profileError) {
            console.error('Referral profile query error:', profileError)
            return NextResponse.json({ error: 'Unable to load referral profile.' }, { status: 500 })
        }

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

        const { data: inviteStats, error: inviteStatsError } = await admin
            .from('referral_invites')
            .select('points_awarded')
            .eq('referrer_user_id', userId)
            .eq('status', 'qualified')
            .returns<InviteStatsRow[]>()

        if (inviteStatsError) {
            console.error('Referral invite stats query error:', inviteStatsError)
            return NextResponse.json({ error: 'Unable to load referral stats.' }, { status: 500 })
        }

        const referralPointsFromInvites = (inviteStats ?? []).reduce(
            (sum, invite) => sum + (invite.points_awarded ?? 0),
            0
        )

        const { data: recentInvites, error: invitesError } = await admin
            .from('referral_invites')
            .select('id, referred_user_id, referral_code_used, points_awarded, status, created_at')
            .eq('referrer_user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)

        if (invitesError) {
            console.error('Referral invites query error:', invitesError)
            return NextResponse.json({ error: 'Unable to load referral invites.' }, { status: 500 })
        }

        const { count: successfulInviteCount, error: successfulInviteCountError } = await admin
            .from('referral_invites')
            .select('id', { count: 'exact', head: true })
            .eq('referrer_user_id', userId)
            .eq('status', 'qualified')

        if (successfulInviteCountError) {
            console.error('Referral invite count query error:', successfulInviteCountError)
            return NextResponse.json({ error: 'Unable to load referral invite count.' }, { status: 500 })
        }

        const { data: rewardRequest, error: rewardRequestError } = await admin
            .from('referral_reward_requests')
            .select('id, status, requested_at, free_courses_to_award, requested_course_id, admin_note')
            .eq('user_id', userId)
            .order('requested_at', { ascending: false })
            .limit(1)
            .maybeSingle<RewardRequestRow>()

        if (rewardRequestError) {
            console.error('Reward request query error:', rewardRequestError)
            return NextResponse.json({ error: 'Unable to load reward request status.' }, { status: 500 })
        }

        const referralPoints = Math.max(referralPointsFromInvites, referralProfile.referral_points)
        const successfulInvitesFromInvites = (inviteStats ?? []).length
        const eligibleFreeCourses = Math.floor(referralPoints / POINTS_PER_FREE_COURSE)
        const availableFreeCoursesToRequest = Math.max(
            eligibleFreeCourses - referralProfile.free_courses_awarded,
            0
        )
        const pointsInCurrentTier = referralPoints % POINTS_PER_FREE_COURSE
        const pointsToNextReward =
            pointsInCurrentTier === 0 && referralPoints > 0
                ? 0
                : POINTS_PER_FREE_COURSE - pointsInCurrentTier

        return NextResponse.json(
            {
                referralCode: referralProfile.referral_code,
                    referralPoints,
                successfulInvites:
                        typeof successfulInviteCount === 'number'
                            ? successfulInviteCount
                            : successfulInvitesFromInvites,
                freeCoursesAwarded: referralProfile.free_courses_awarded,
                eligibleFreeCourses,
                availableFreeCoursesToRequest,
                pointsToNextReward,
                recentInvites: recentInvites ?? [],
                latestRewardRequest: rewardRequest,
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
