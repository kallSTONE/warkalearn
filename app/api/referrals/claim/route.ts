import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/api-auth'
import { claimReferralInvite } from '@/lib/referrals'

function normalizeReferralCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.toUpperCase() : null
}

function mapClaimStatusToResponse(status: string) {
  switch (status) {
    case 'claimed':
      return { httpStatus: 200, error: null }
    case 'already_claimed':
      return { httpStatus: 409, error: 'Referral was already claimed for this account.' }
    case 'invalid_code':
      return { httpStatus: 400, error: 'Referral code is invalid.' }
    case 'self_referral':
      return { httpStatus: 400, error: 'You cannot use your own referral code.' }
    case 'system_inactive':
      return { httpStatus: 409, error: 'Referral system is currently inactive.' }
    case 'invalid_input':
      return { httpStatus: 400, error: 'Referral claim payload is invalid.' }
    default:
      return { httpStatus: 500, error: 'Unable to claim referral right now.' }
  }
}

export async function POST(request: Request) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const body = await request.json().catch(() => ({}))
    const userId = authResult.context.userId

    const finalReferralCode =
      normalizeReferralCode(body?.referralCode) ??
      normalizeReferralCode(body?.referral_code) ??
      null

    if (!finalReferralCode) {
      return NextResponse.json({ error: 'Referral code is required.' }, { status: 400 })
    }

    const result = await claimReferralInvite({
      referredUserId: userId,
      referralCode: finalReferralCode,
      points: 100,
    })

    const claimStatus = result.status
    const responseShape = mapClaimStatusToResponse(claimStatus)

    if (responseShape.httpStatus !== 200) {
      return NextResponse.json(
        {
          success: false,
          status: claimStatus,
          error: responseShape.error,
          referrerUserId: result.referrer_user_id,
          referralCode: finalReferralCode,
        },
        { status: responseShape.httpStatus }
      )
    }

    return NextResponse.json(
      {
        success: true,
        status: claimStatus,
        referrerUserId: result.referrer_user_id,
        referralCode: finalReferralCode,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Referral claim API error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to claim referral.' }, { status: 500 })
  }
}
