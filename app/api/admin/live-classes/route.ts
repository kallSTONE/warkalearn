import { NextResponse } from 'next/server'
import { db } from '@/db'
import { liveClasses, liveClassRegistrations } from '@/db/schema'
import { requireAdminRequest } from '@/lib/server/api-auth'
import { asc, inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const normalizeSlug = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')

function formatLiveClass(row: typeof liveClasses.$inferSelect, count = 0) {
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
    registration_count: count,
  }
}

export async function GET(request: Request) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const classRows = await db
      .select()
      .from(liveClasses)
      .orderBy(asc(liveClasses.startAt))

    if (classRows.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    const classIds = classRows.map((row) => row.id)
    const registrations = await db
      .select({
        id: liveClassRegistrations.id,
        liveClassId: liveClassRegistrations.liveClassId,
      })
      .from(liveClassRegistrations)
      .where(inArray(liveClassRegistrations.liveClassId, classIds))

    const countByClassId = new Map<string, number>()
    registrations.forEach((row) => {
      countByClassId.set(row.liveClassId, (countByClassId.get(row.liveClassId) ?? 0) + 1)
    })

    const data = classRows.map((row) => formatLiveClass(row, countByClassId.get(row.id) ?? 0))

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

    const slug = normalizeSlug(body?.slug)
    const title = String(body?.title ?? '').trim()
    const instructorName = String(body?.instructor_name ?? '').trim()
    const startAtStr = String(body?.start_at ?? '').trim()

    if (!slug || !title || !instructorName || !startAtStr) {
      return NextResponse.json({ error: 'slug, title, instructor_name, and start_at are required.' }, { status: 400 })
    }

    const priceValue = Number(body?.price ?? 0)
    const seatsValue = body?.seats_total === '' || body?.seats_total === null || body?.seats_total === undefined
      ? null
      : Number(body?.seats_total)

    if (Number.isNaN(priceValue) || priceValue < 0) {
      return NextResponse.json({ error: 'price must be a valid non-negative number.' }, { status: 400 })
    }

    const [inserted] = await db
      .insert(liveClasses)
      .values({
        slug,
        title,
        description: body?.description ? String(body.description).trim() : null,
        instructorName,
        instructorBio: body?.instructor_bio ? String(body.instructor_bio).trim() : null,
        instructorAvatarUrl: body?.instructor_avatar_url ? String(body.instructor_avatar_url).trim() : null,
        coverImageUrl: body?.cover_image_url ? String(body.cover_image_url).trim() : null,
        meetingPlatform: body?.meeting_platform ? String(body.meeting_platform).trim() : 'Zoom',
        meetingUrl: body?.meeting_url ? String(body.meeting_url).trim() : null,
        startAt: new Date(startAtStr),
        endAt: body?.end_at ? new Date(String(body.end_at).trim()) : null,
        timezone: body?.timezone ? String(body.timezone).trim() : 'Africa/Addis_Ababa',
        price: String(priceValue),
        currency: body?.currency ? String(body.currency).trim().toUpperCase() : 'ETB',
        seatsTotal: seatsValue,
        status: ['draft', 'published', 'archived'].includes(String(body?.status ?? '').trim())
          ? String(body?.status).trim()
          : 'draft',
        registrationStatus: ['open', 'closed'].includes(String(body?.registration_status ?? '').trim())
          ? String(body?.registration_status).trim()
          : 'open',
        createdBy: authResult.context.userId,
      })
      .returning()

    return NextResponse.json({ data: formatLiveClass(inserted, 0) }, { status: 201 })
  } catch (error: any) {
    console.error('Admin live classes POST error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to create live class.' }, { status: 500 })
  }
}
