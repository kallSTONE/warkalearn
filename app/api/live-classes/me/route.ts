import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { authenticateRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type LiveClassRegistrationRow = {
  id: string
  live_class_id: string
  payment_status: string
  payment_method: string
  payment_reference: string | null
  amount_paid: number
  registration_status: string
  notes: string | null
  created_at: string
  updated_at: string
  live_classes: {
    id: string
    slug: string
    title: string
    description: string | null
    instructor_name: string
    instructor_avatar_url: string | null
    cover_image_url: string | null
    meeting_platform: string
    meeting_url: string | null
    start_at: string
    end_at: string | null
    timezone: string
    price: number
    currency: string
    seats_total: number | null
    status: string
    registration_status: string
  } | null
}

export async function GET(request: Request) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const admin = getSupabaseAdminClient()
    const { data, error } = await admin
      .from('live_class_registrations')
      .select(`
        id,
        live_class_id,
        payment_status,
        payment_method,
        payment_reference,
        amount_paid,
        registration_status,
        notes,
        created_at,
        updated_at,
        live_classes (
          id,
          slug,
          title,
          description,
          instructor_name,
          instructor_avatar_url,
          cover_image_url,
          meeting_platform,
          meeting_url,
          start_at,
          end_at,
          timezone,
          price,
          currency,
          seats_total,
          status,
          registration_status
        )
      `)
      .eq('user_id', authResult.context.userId)
      .order('created_at', { ascending: false })
      .returns<LiveClassRegistrationRow[]>()

    if (error) {
      console.error('Live class registrations me query error:', error)
      return NextResponse.json({ error: 'Unable to load live class registrations.' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 })
  } catch (error: any) {
    console.error('Live class registrations me GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load live class registrations.' }, { status: 500 })
  }
}
