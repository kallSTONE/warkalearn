import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type RewardRequestRow = {
  id: string
  user_id: string
  status: string
  free_courses_to_award: number
  requested_course_id: number | null
}

type ActivateRewardResult = {
  status: string
  user_id: string | null
  free_courses_awarded: number | null
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function buildRewardCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const randomChunk = Array.from({ length: 10 })
    .map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
    .join('')

  return `RW-${randomChunk}`
}

async function insertCodesForRequest(options: {
  admin: ReturnType<typeof getSupabaseAdminClient>
  requestId: string
  userId: string
  adminUserId: string
  codeCount: number
}) {
  const { admin, requestId, userId, adminUserId, codeCount } = options
  const createdCodeIds: string[] = []
  const createdCodes: string[] = []

  for (let index = 0; index < codeCount; index += 1) {
    let inserted = false

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = buildRewardCode()

      const { data, error } = await admin
        .from('referral_reward_codes')
        .insert({
        request_id: requestId,
        user_id: userId,
        code,
        status: 'active',
        created_by: adminUserId,
      })
        .select('id, code')
        .single()

      if (!error) {
        if (data?.id) {
          createdCodeIds.push(data.id)
        }
        createdCodes.push(data?.code ?? code)
        inserted = true
        break
      }

      const isUniqueViolation = String((error as any)?.code ?? '') === '23505'
      if (!isUniqueViolation) {
        const dbErrorMessage = String((error as any)?.message ?? 'Unknown database error.')
        throw new Error(`Failed to create reward code: ${dbErrorMessage}`)
      }
    }

    if (!inserted) {
      throw new Error('Failed to generate a unique reward code. Please try again.')
    }
  }

  return { createdCodes, createdCodeIds }
}

export async function PATCH(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const authResult = await requireAdminRequest(request)

  if (!authResult.ok) {
    return authResult.response
  }

  try {
    const requestId = decodeURIComponent(params.requestId || '').trim()
    if (!isUuid(requestId)) {
      return NextResponse.json({ error: 'Invalid request id.' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const action = typeof body?.action === 'string' ? body.action.trim().toLowerCase() : ''
    const adminNote = typeof body?.adminNote === 'string' ? body.adminNote.trim() : null

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: "action must be either 'approve' or 'reject'." },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdminClient()

    const { data: rewardRequest, error: rewardRequestError } = await admin
      .from('referral_reward_requests')
      .select('id, user_id, status, free_courses_to_award, requested_course_id')
      .eq('id', requestId)
      .maybeSingle<RewardRequestRow>()

    if (rewardRequestError) {
      console.error('Reward request fetch error:', rewardRequestError)
      return NextResponse.json({ error: 'Unable to load reward request.' }, { status: 500 })
    }

    if (!rewardRequest) {
      return NextResponse.json({ error: 'Reward request not found.' }, { status: 404 })
    }

    if (rewardRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Reward request has already been handled.' },
        { status: 409 }
      )
    }

    if (action === 'reject') {
      const { error: rejectError } = await admin
        .from('referral_reward_requests')
        .update({
          status: 'rejected',
          handled_at: new Date().toISOString(),
          handled_by: authResult.context.userId,
          admin_note: adminNote,
        })
        .eq('id', requestId)

      if (rejectError) {
        console.error('Reward request reject error:', rejectError)
        return NextResponse.json({ error: 'Unable to reject reward request.' }, { status: 500 })
      }

      return NextResponse.json({ success: true, status: 'rejected' }, { status: 200 })
    }

    const codeCount = Math.max(rewardRequest.free_courses_to_award, 1)

    const { createdCodes, createdCodeIds } = await insertCodesForRequest({
      admin,
      requestId,
      userId: rewardRequest.user_id,
      adminUserId: authResult.context.userId,
      codeCount,
    })

    const { data: activationData, error: activationError } = await admin.rpc('activate_referral_reward', {
      p_request_id: requestId,
      p_admin_user_id: authResult.context.userId,
    })

    if (activationError) {
      console.error('activate_referral_reward RPC error:', activationError)

      if (createdCodeIds.length > 0) {
        const { error: cleanupError } = await admin
          .from('referral_reward_codes')
          .delete()
          .in('id', createdCodeIds)

        if (cleanupError) {
          console.error('Reward code cleanup error:', cleanupError)
        }
      }

      return NextResponse.json(
        {
          error: `Unable to activate reward request. ${String((activationError as any)?.message ?? '')}`,
        },
        { status: 500 }
      )
    }

    const activationResult = (Array.isArray(activationData)
      ? activationData[0]
      : activationData) as ActivateRewardResult | null

    if (!activationResult || activationResult.status !== 'activated') {
      const activationStatus = activationResult?.status ?? 'unknown'

      if (createdCodeIds.length > 0) {
        const { error: cleanupError } = await admin
          .from('referral_reward_codes')
          .delete()
          .in('id', createdCodeIds)

        if (cleanupError) {
          console.error('Reward code cleanup error:', cleanupError)
        }
      }

      return NextResponse.json(
        { error: `Unable to activate reward request (${activationStatus}).` },
        { status: 409 }
      )
    }

    if (adminNote) {
      const { error: noteError } = await admin
        .from('referral_reward_requests')
        .update({ admin_note: adminNote })
        .eq('id', requestId)

      if (noteError) {
        console.error('Reward request admin note update error:', noteError)
      }
    }

    return NextResponse.json(
      {
        success: true,
        status: 'activated',
        codes: createdCodes,
        freeCoursesAwarded: codeCount,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Admin reward-request PATCH error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Unable to manage reward request.' },
      { status: 500 }
    )
  }
}
