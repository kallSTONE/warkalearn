import { NextResponse } from 'next/server'
import { db } from '@/db'
import { liveClasses, liveClassRegistrations } from '@/db/schema'
import { authenticateRequest } from '@/lib/server/api-auth'
import { eq, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const userId = authResult.context.userId

    const rows = await db
      .select({
        registration: liveClassRegistrations,
        liveClass: liveClasses,
      })
      .from(liveClassRegistrations)
      .innerJoin(liveClasses, eq(liveClassRegistrations.liveClassId, liveClasses.id))
      .where(eq(liveClassRegistrations.userId, userId))
      .orderBy(desc(liveClassRegistrations.createdAt))

    const data = rows.map(({ registration, liveClass }) => ({
      id: registration.id,
      live_class_id: registration.liveClassId,
      payment_status: registration.paymentStatus,
      payment_method: registration.paymentMethod,
      payment_reference: registration.paymentReference,
      amount_paid: Number(registration.amountPaid ?? 0),
      registration_status: registration.registrationStatus,
      notes: registration.notes,
      created_at: registration.createdAt?.toISOString(),
      updated_at: registration.updatedAt?.toISOString(),
      live_classes: liveClass
        ? {
            id: liveClass.id,
            slug: liveClass.slug,
            title: liveClass.title,
            description: liveClass.description,
            instructor_name: liveClass.instructorName,
            instructor_avatar_url: liveClass.instructorAvatarUrl,
            cover_image_url: liveClass.coverImageUrl,
            meeting_platform: liveClass.meetingPlatform,
            meeting_url: liveClass.meetingUrl,
            start_at: liveClass.startAt?.toISOString(),
            end_at: liveClass.endAt?.toISOString() ?? null,
            timezone: liveClass.timezone,
            price: Number(liveClass.price ?? 0),
            currency: liveClass.currency,
            seats_total: liveClass.seatsTotal,
            status: liveClass.status,
            registration_status: liveClass.registrationStatus,
          }
        : null,
    }))

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error('Live class registrations me GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load live class registrations.' }, { status: 500 })
  }
}
