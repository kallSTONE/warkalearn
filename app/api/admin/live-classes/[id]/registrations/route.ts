import { NextResponse } from 'next/server'
import { db } from '@/db'
import { liveClasses, liveClassRegistrations, profiles } from '@/db/schema'
import { requireAdminRequest } from '@/lib/server/api-auth'
import { desc, eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const rows = await db
      .select({
        registration: liveClassRegistrations,
        liveClass: liveClasses,
        profile: profiles,
      })
      .from(liveClassRegistrations)
      .leftJoin(liveClasses, eq(liveClassRegistrations.liveClassId, liveClasses.id))
      .leftJoin(profiles, eq(liveClassRegistrations.userId, profiles.id))
      .where(eq(liveClassRegistrations.liveClassId, params.id))
      .orderBy(desc(liveClassRegistrations.createdAt))

    const data = rows.map(({ registration, liveClass, profile }) => ({
      id: registration.id,
      live_class_id: registration.liveClassId,
      user_id: registration.userId,
      amount_paid: Number(registration.amountPaid ?? 0),
      payment_status: registration.paymentStatus,
      payment_method: registration.paymentMethod,
      payment_reference: registration.paymentReference,
      registration_status: registration.registrationStatus,
      notes: registration.notes,
      created_at: registration.createdAt?.toISOString(),
      updated_at: registration.updatedAt?.toISOString(),
      live_classes: liveClass
        ? {
            id: liveClass.id,
            title: liveClass.title,
            slug: liveClass.slug,
            start_at: liveClass.startAt?.toISOString(),
            meeting_platform: liveClass.meetingPlatform,
            meeting_url: liveClass.meetingUrl,
            currency: liveClass.currency,
          }
        : null,
      profiles: profile
        ? {
            id: profile.id,
            full_name: profile.fullName,
            role: profile.role,
          }
        : null,
    }))

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error('Admin live class registrations GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load registrations.' }, { status: 500 })
  }
}
