import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const normalizeSlug = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')

const parsePartialPayload = (body: any) => {
  const payload: Record<string, unknown> = {}

  if (body?.slug !== undefined) payload.slug = normalizeSlug(body.slug)
  if (body?.title !== undefined) payload.title = String(body.title ?? '').trim()
  if (body?.description !== undefined) payload.description = body.description ? String(body.description).trim() : null
  if (body?.instructor_name !== undefined) payload.instructor_name = String(body.instructor_name ?? '').trim()
  if (body?.instructor_bio !== undefined) payload.instructor_bio = body.instructor_bio ? String(body.instructor_bio).trim() : null
  if (body?.instructor_avatar_url !== undefined) payload.instructor_avatar_url = body.instructor_avatar_url ? String(body.instructor_avatar_url).trim() : null
  if (body?.cover_image_url !== undefined) payload.cover_image_url = body.cover_image_url ? String(body.cover_image_url).trim() : null
  if (body?.meeting_platform !== undefined) payload.meeting_platform = String(body.meeting_platform ?? '').trim() || 'Zoom'
  if (body?.meeting_url !== undefined) payload.meeting_url = body.meeting_url ? String(body.meeting_url).trim() : null
  if (body?.start_at !== undefined) payload.start_at = String(body.start_at ?? '').trim()
  if (body?.end_at !== undefined) payload.end_at = body.end_at ? String(body.end_at).trim() : null
  if (body?.timezone !== undefined) payload.timezone = String(body.timezone ?? '').trim() || 'Africa/Addis_Ababa'
  if (body?.price !== undefined) {
    const price = Number(body.price)
    if (Number.isNaN(price) || price < 0) {
      return { error: 'price must be a valid non-negative number.' }
    }
    payload.price = price
  }
  if (body?.currency !== undefined) payload.currency = String(body.currency ?? '').trim().toUpperCase() || 'ETB'
  if (body?.seats_total !== undefined) {
    const seats = body.seats_total === '' || body.seats_total === null ? null : Number(body.seats_total)
    if (seats !== null && (Number.isNaN(seats) || seats <= 0)) {
      return { error: 'seats_total must be a positive number or empty.' }
    }
    payload.seats_total = seats
  }
  if (body?.status !== undefined) {
    const status = String(body.status ?? '').trim()
    if (!['draft', 'published', 'archived'].includes(status)) {
      return { error: 'status must be draft, published, or archived.' }
    }
    payload.status = status
  }
  if (body?.registration_status !== undefined) {
    const registrationStatus = String(body.registration_status ?? '').trim()
    if (!['open', 'closed'].includes(registrationStatus)) {
      return { error: 'registration_status must be open or closed.' }
    }
    payload.registration_status = registrationStatus
  }

  if (body?.title !== undefined && !String(body.title ?? '').trim()) {
    return { error: 'title cannot be empty.' }
  }
  if (body?.slug !== undefined && !normalizeSlug(body.slug)) {
    return { error: 'slug cannot be empty.' }
  }
  if (body?.instructor_name !== undefined && !String(body.instructor_name ?? '').trim()) {
    return { error: 'instructor_name cannot be empty.' }
  }
  if (body?.start_at !== undefined && !String(body.start_at ?? '').trim()) {
    return { error: 'start_at cannot be empty.' }
  }

  return { data: payload }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const admin = getSupabaseAdminClient()
    const { data, error } = await admin
      .from('live_classes')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (error) {
      console.error('Admin live class detail error:', error)
      return NextResponse.json({ error: 'Unable to load live class.' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Live class not found.' }, { status: 404 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error('Admin live class GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load live class.' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const body = await request.json()
    const parsed = parsePartialPayload(body)
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const admin = getSupabaseAdminClient()
    const { data, error } = await admin
      .from('live_classes')
      .update(parsed.data)
      .eq('id', params.id)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('Admin live class update error:', error)
      return NextResponse.json({ error: 'Unable to update live class.' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Live class not found.' }, { status: 404 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error('Admin live class PATCH error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to update live class.' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const admin = getSupabaseAdminClient()
    const { error } = await admin.from('live_classes').delete().eq('id', params.id)

    if (error) {
      console.error('Admin live class delete error:', error)
      return NextResponse.json({ error: 'Unable to delete live class.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error: any) {
    console.error('Admin live class DELETE error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to delete live class.' }, { status: 500 })
  }
}
