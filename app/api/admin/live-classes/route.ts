import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type LiveClassRow = {
  id: string
  slug: string
  title: string
  description: string | null
  instructor_name: string
  instructor_bio: string | null
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
  created_by: string | null
  created_at: string
  updated_at: string
}

type RegistrationCountRow = {
  live_class_id: string
  count: string | number
}

const normalizeSlug = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')

const parsePayload = (body: any) => {
  const slug = normalizeSlug(body?.slug)
  const title = String(body?.title ?? '').trim()
  const instructorName = String(body?.instructor_name ?? '').trim()
  const startAt = String(body?.start_at ?? '').trim()

  if (!slug || !title || !instructorName || !startAt) {
    return { error: 'slug, title, instructor_name, and start_at are required.' }
  }

  const priceValue = Number(body?.price ?? 0)
  const seatsValue = body?.seats_total === '' || body?.seats_total === null || body?.seats_total === undefined
    ? null
    : Number(body?.seats_total)

  if (Number.isNaN(priceValue) || priceValue < 0) {
    return { error: 'price must be a valid non-negative number.' }
  }

  if (seatsValue !== null && (Number.isNaN(seatsValue) || seatsValue <= 0)) {
    return { error: 'seats_total must be a positive number or empty.' }
  }

  return {
    data: {
      slug,
      title,
      description: body?.description ? String(body.description).trim() : null,
      instructor_name: instructorName,
      instructor_bio: body?.instructor_bio ? String(body.instructor_bio).trim() : null,
      instructor_avatar_url: body?.instructor_avatar_url ? String(body.instructor_avatar_url).trim() : null,
      cover_image_url: body?.cover_image_url ? String(body.cover_image_url).trim() : null,
      meeting_platform: body?.meeting_platform ? String(body.meeting_platform).trim() : 'Zoom',
      meeting_url: body?.meeting_url ? String(body.meeting_url).trim() : null,
      start_at: startAt,
      end_at: body?.end_at ? String(body.end_at).trim() : null,
      timezone: body?.timezone ? String(body.timezone).trim() : 'Africa/Addis_Ababa',
      price: priceValue,
      currency: body?.currency ? String(body.currency).trim().toUpperCase() : 'ETB',
      seats_total: seatsValue,
      status: ['draft', 'published', 'archived'].includes(String(body?.status ?? '').trim())
        ? String(body?.status).trim()
        : 'draft',
      registration_status: ['open', 'closed'].includes(String(body?.registration_status ?? '').trim())
        ? String(body?.registration_status).trim()
        : 'open',
    },
  }
}

export async function GET(request: Request) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const admin = getSupabaseAdminClient()

    const { data: classes, error: classesError } = await admin
      .from('live_classes')
      .select('*')
      .order('start_at', { ascending: true })
      .returns<LiveClassRow[]>()

    if (classesError) {
      console.error('Admin live classes list error:', classesError)
      return NextResponse.json({ error: 'Unable to load live classes.' }, { status: 500 })
    }

    const classRows = classes ?? []
    if (classRows.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    const classIds = classRows.map((row) => row.id)
    const { data: registrations, error: registrationsError } = await admin
      .from('live_class_registrations')
      .select('live_class_id, id')
      .in('live_class_id', classIds)
      .returns<Array<{ live_class_id: string; id: string }>>()

    if (registrationsError) {
      console.error('Admin live classes registrations query error:', registrationsError)
      return NextResponse.json({ error: 'Unable to load live class registrations.' }, { status: 500 })
    }

    const countByClassId = new Map<string, number>()
    ;(registrations ?? []).forEach((row) => {
      countByClassId.set(row.live_class_id, (countByClassId.get(row.live_class_id) ?? 0) + 1)
    })

    const data = classRows.map((row) => ({
      ...row,
      registration_count: countByClassId.get(row.id) ?? 0,
    }))

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error('Admin live classes GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load live classes.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const body = await request.json()
    const parsed = parsePayload(body)

    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const admin = getSupabaseAdminClient()
    const { data, error } = await admin
      .from('live_classes')
      .insert({
        ...parsed.data,
        created_by: authResult.context.userId,
      })
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('Admin live class create error:', error)
      return NextResponse.json({ error: 'Unable to create live class.' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error('Admin live classes POST error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to create live class.' }, { status: 500 })
  }
}
