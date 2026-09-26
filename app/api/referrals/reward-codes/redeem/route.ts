import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { authenticateRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type RedeemResult = {
  status: string
  enrollment_id: string | null
  reward_code_id: string | null
}

export async function POST(request: Request) {
  const authResult = await authenticateRequest(request)

  if (!authResult.ok) {
    return authResult.response
  }

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

    const admin = getSupabaseAdminClient()

    const { data, error } = await admin.rpc('redeem_referral_reward_code', {
      p_user_id: authResult.context.userId,
      p_code: code,
      p_course_id: courseId,
    })

    if (error) {
      console.error('redeem_referral_reward_code RPC error:', error)
      return NextResponse.json({ error: 'Unable to redeem reward code.' }, { status: 500 })
    }

    const result = (Array.isArray(data) ? data[0] : data) as RedeemResult | null
    const status = result?.status ?? 'unknown'

    if (status === 'redeemed' || status === 'already_enrolled') {
      return NextResponse.json(
        {
          success: true,
          status,
          enrollmentId: result?.enrollment_id ?? null,
          rewardCodeId: result?.reward_code_id ?? null,
        },
        { status: 200 }
      )
    }

    const messageByStatus: Record<string, string> = {
      invalid_input: 'Code redemption payload is invalid.',
      invalid_code: 'Reward code is invalid.',
      not_owner: 'This reward code is not assigned to your account.',
      code_not_active: 'This reward code is no longer active.',
      code_expired: 'This reward code has expired.',
      course_not_found: 'Selected course was not found.',
    }

    const errorMessage = messageByStatus[status] ?? `Unable to redeem code (${status}).`
    const statusCode = status === 'not_owner' ? 403 : 400

    return NextResponse.json({ error: errorMessage, status }, { status: statusCode })
  } catch (error: any) {
    console.error('Referral reward code redeem API error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Unable to redeem reward code.' },
      { status: 500 }
    )
  }
}
