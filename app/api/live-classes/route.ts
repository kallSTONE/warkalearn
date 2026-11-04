import { NextResponse } from 'next/server'
import { db } from '@/db'
import { liveClasses } from '@/db/schema'
import { asc, eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(liveClasses)
      .where(eq(liveClasses.status, 'published'))
      .orderBy(asc(liveClasses.startAt))

    const data = rows.map((row) => ({
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
    }))

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error('Public live classes GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to load live classes' }, { status: 500 })
  }
}

