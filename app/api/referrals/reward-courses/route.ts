import { NextResponse } from 'next/server'
import { db } from '@/db'
import { courses } from '@/db/schema'
import { authenticateRequest } from '@/lib/server/api-auth'
import { asc, eq, or } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const rows = await db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        is_paid: courses.isPaid,
        published: courses.published,
        status: courses.status,
      })
      .from(courses)
      .where(or(eq(courses.published, true), eq(courses.status, 'published')))
      .orderBy(asc(courses.title))

    return NextResponse.json({ courses: rows }, { status: 200 })
  } catch (error: any) {
    console.error('Reward courses GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load courses.' }, { status: 500 })
  }
}
