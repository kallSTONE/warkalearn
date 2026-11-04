import { NextResponse } from 'next/server'
import { db } from '@/db'
import { liveClasses } from '@/db/schema'
import { requireAdminRequest } from '@/lib/server/api-auth'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const normalizeSlug = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')

function formatLiveClass(row: typeof liveClasses.$inferSelect) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    instructor_name: row.instructorName,
    instructor_bio: row.instructorBio,
    instructor_avatar_url: row.instructorAvatarUrl,
    cover_image_url: row.coverImageUrl,
    meeting_platform: row.meetingPlatform,
    meeting_url: row.meetingUrl,
    start_at: row.startAt?.toISOString(),
    end_at: row.endAt?.toISOString() ?? null,
    timezone: row.timezone,
    price: Number(row.price ?? 0),
    currency: row.currency,
    seats_total: row.seatsTotal,
    status: row.status,
    registration_status: row.registrationStatus,
    created_by: row.createdBy,
    created_at: row.createdAt?.toISOString(),
    updated_at: row.updatedAt?.toISOString(),
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const [liveClass] = await db
      .select()
      .from(liveClasses)
      .where(eq(liveClasses.id, params.id))
      .limit(1)

    if (!liveClass) {
      return NextResponse.json({ error: 'Live class not found.' }, { status: 404 })
    }

    return NextResponse.json({ data: formatLiveClass(liveClass) }, { status: 200 })
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
    const updateValues: Partial<typeof liveClasses.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (body?.slug !== undefined) updateValues.slug = normalizeSlug(body.slug)
    if (body?.title !== undefined) updateValues.title = String(body.title ?? '').trim()
    if (body?.description !== undefined) {
      updateValues.description = body.description ? String(body.description).trim() : null
    }
    if (body?.instructor_name !== undefined) {
      updateValues.instructorName = String(body.instructor_name ?? '').trim()
    }
    if (body?.instructor_bio !== undefined) {
      updateValues.instructorBio = body.instructor_bio ? String(body.instructor_bio).trim() : null
    }
    if (body?.instructor_avatar_url !== undefined) {
      updateValues.instructorAvatarUrl = body.instructor_avatar_url ? String(body.instructor_avatar_url).trim() : null
    }
    if (body?.cover_image_url !== undefined) {
      updateValues.coverImageUrl = body.cover_image_url ? String(body.cover_image_url).trim() : null
    }
    if (body?.meeting_platform !== undefined) {
      updateValues.meetingPlatform = String(body.meeting_platform ?? '').trim() || 'Zoom'
    }
    if (body?.meeting_url !== undefined) {
      updateValues.meetingUrl = body.meeting_url ? String(body.meeting_url).trim() : null
    }
    if (body?.start_at !== undefined) {
      updateValues.startAt = new Date(String(body.start_at).trim())
    }
    if (body?.end_at !== undefined) {
      updateValues.endAt = body.end_at ? new Date(String(body.end_at).trim()) : null
    }
    if (body?.timezone !== undefined) {
      updateValues.timezone = String(body.timezone ?? '').trim() || 'Africa/Addis_Ababa'
    }
    if (body?.price !== undefined) {
      const price = Number(body.price)
      if (Number.isNaN(price) || price < 0) {
        return NextResponse.json({ error: 'price must be a valid non-negative number.' }, { status: 400 })
      }
      updateValues.price = String(price)
    }
    if (body?.currency !== undefined) {
      updateValues.currency = String(body.currency ?? '').trim().toUpperCase() || 'ETB'
    }
    if (body?.seats_total !== undefined) {
      const seats = body.seats_total === '' || body.seats_total === null ? null : Number(body.seats_total)
      if (seats !== null && (Number.isNaN(seats) || seats <= 0)) {
        return NextResponse.json({ error: 'seats_total must be a positive number or empty.' }, { status: 400 })
      }
      updateValues.seatsTotal = seats
    }
    if (body?.status !== undefined) {
      const status = String(body.status ?? '').trim()
      if (!['draft', 'published', 'archived'].includes(status)) {
        return NextResponse.json({ error: 'status must be draft, published, or archived.' }, { status: 400 })
      }
      updateValues.status = status
    }
    if (body?.registration_status !== undefined) {
      const registrationStatus = String(body.registration_status ?? '').trim()
      if (!['open', 'closed'].includes(registrationStatus)) {
        return NextResponse.json({ error: 'registration_status must be open or closed.' }, { status: 400 })
      }
      updateValues.registrationStatus = registrationStatus
    }

    const [updated] = await db
      .update(liveClasses)
      .set(updateValues)
      .where(eq(liveClasses.id, params.id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Live class not found.' }, { status: 404 })
    }

    return NextResponse.json({ data: formatLiveClass(updated) }, { status: 200 })
  } catch (error: any) {
    console.error('Admin live class PATCH error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to update live class.' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    await db.delete(liveClasses).where(eq(liveClasses.id, params.id))
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error: any) {
    console.error('Admin live class DELETE error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to delete live class.' }, { status: 500 })
  }
}
