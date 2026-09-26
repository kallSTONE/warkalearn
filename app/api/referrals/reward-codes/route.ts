import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { authenticateRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type RewardCodeRow = {
  id: string
  code: string
  status: string
  created_at: string
  expires_at: string | null
  request_id: string
}

export async function GET(request: Request) {
  const authResult = await authenticateRequest(request)

  if (!authResult.ok) {
    return authResult.response
  }

  try {
    const admin = getSupabaseAdminClient()
    const userId = authResult.context.userId

    const { data: activeCodes, error } = await admin
      .from('referral_reward_codes')
      .select('id, code, status, created_at, expires_at, request_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .returns<RewardCodeRow[]>()

    if (error) {
      console.error('Referral reward codes fetch error:', error)
      return NextResponse.json({ error: 'Unable to load reward codes.' }, { status: 500 })
    }

    const nowIso = new Date().toISOString()
    const usableCodes = (activeCodes ?? []).filter(
      (code) => !code.expires_at || code.expires_at > nowIso
    )

    return NextResponse.json({ codes: usableCodes }, { status: 200 })
  } catch (error: any) {
    console.error('Referral reward codes GET error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Unable to load reward codes.' },
      { status: 500 }
    )
  }
}
