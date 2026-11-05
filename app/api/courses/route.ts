import { NextResponse } from 'next/server'
import { db } from '@/db'
import { courses, courseMedia } from '@/db/schema'
import { asc, eq, or, inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const courseRows = await db
      .select()
      .from(courses)
      .where(or(eq(courses.published, true), eq(courses.status, 'published')))
      .orderBy(asc(courses.id))

    if (courseRows.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    const courseIds = courseRows.map((c) => c.id)
    const mediaRows = await db
      .select()
      .from(courseMedia)
      .where(inArray(courseMedia.courseId, courseIds))

    const mediaByCourseId = new Map<number, any[]>()
    mediaRows.forEach((m) => {
      const list = mediaByCourseId.get(m.courseId) ?? []
      list.push({
        id: m.id,
        type: m.type,
        provider: m.provider,
        url: m.url,
      })
      mediaByCourseId.set(m.courseId, list)
    })

    const data = courseRows.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      hero_image: c.heroImage,
      image: c.heroImage,
      category: c.category,
      level: c.level,
      estimated_hours: c.estimatedHours,
      students: c.students,
      rating: Number(c.rating ?? 0),
      featured: c.featured,
      published: c.published,
      status: c.status,
      is_paid: c.isPaid,
      price: Number(c.price ?? 0),
      course_media: mediaByCourseId.get(c.id) ?? [],
    }))

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error('Courses GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to load courses' }, { status: 500 })
  }
}

