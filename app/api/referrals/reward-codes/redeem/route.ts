import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/api-auth'
import { redeemReferralRewardCode } from '@/lib/referrals'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function POST(request: Request) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const body = await request.json().catch(() => ({}))
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
    const courseIdRaw = body?.courseId
    const courseId = typeof courseIdRaw === 'number' ? courseIdRaw : Number(courseIdRaw)

    if (!code) {
      return NextResponse.json({ error: 'Code is required.' }, { status: 400 })
    }

    if (!Number.isFinite(courseId)) {
      return NextResponse.json({ error: 'Valid courseId is required.' }, { status: 400 })
    }

    const result = await redeemReferralRewardCode({
      userId: authResult.context.userId,
      code,
      courseId,
    })

    const status = result.status

    if (status === 'redeemed' || status === 'already_enrolled') {
      return NextResponse.json(
        {
          success: true,
          status,
          enrollmentId: result.enrollment_id,
          rewardCodeId: result.reward_code_id,
        },
        { status: 200 }
      )
    }

    const statusCode =
      status === 'course_not_found'
        ? 404
        : status === 'invalid_code' || status === 'invalid_input'
          ? 400
          : status === 'not_owner'
            ? 403
            : status === 'code_not_active' || status === 'code_expired'
              ? 410
              : 400

    return NextResponse.json(
      {
        success: false,
        status,
        error: `Unable to redeem reward code: ${status}`,
        rewardCodeId: result.reward_code_id,
      },
      { status: statusCode }
    )
  } catch (error: any) {
    console.error('redeem_referral_reward_code error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to redeem reward code.' }, { status: 500 })
  }
}
