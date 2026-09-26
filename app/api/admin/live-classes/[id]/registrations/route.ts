import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type LiveClassRegistrationRow = {
  id: string
  live_class_id: string
  user_id: string
  amount_paid: number
  payment_status: string
  payment_method: string
  payment_reference: string | null
  registration_status: string
  notes: string | null
  created_at: string
  updated_at: string
  live_classes: {
    id: string
    title: string
    slug: string
    start_at: string
    meeting_platform: string
    meeting_url: string | null
    currency: string
  } | null
  profiles: {
    id: string
    full_name: string | null
    role: string | null
  } | null
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const admin = getSupabaseAdminClient()
    const { data, error } = await admin
      .from('live_class_registrations')
      .select(`
        id,
        live_class_id,
        user_id,
        amount_paid,
        payment_status,
        payment_method,
        payment_reference,
        registration_status,
        notes,
        created_at,
        updated_at,
        live_classes (
          id,
          title,
          slug,
          start_at,
          meeting_platform,
          meeting_url,
          currency
        ),
        profiles (
          id,
          full_name,
          role
        )
      `)
      .eq('live_class_id', params.id)
      .order('created_at', { ascending: false })
      .returns<LiveClassRegistrationRow[]>()

    if (error) {
      console.error('Admin live class registrations query error:', error)
      return NextResponse.json({ error: 'Unable to load live class enrolments.' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 })
  } catch (error: any) {
    console.error('Admin live class registrations GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load live class enrolments.' }, { status: 500 })
  }
}
