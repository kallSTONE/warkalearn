import { NextResponse } from 'next/server'
import { db } from '@/db'
import { programs } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await db.query.programs.findMany({
      where: eq(programs.status, 'published'),
      orderBy: [desc(programs.createdAt)],
      with: {
        programCourses: {
          orderBy: (pc, { asc }) => [asc(pc.sortOrder)],
          with: {
            course: true,
          },
        },
      },
    })

    const formatted = rows.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      status: p.status,
      thumbnail: p.thumbnail,
      price: p.price ? Number(p.price) : null,
      created_at: p.createdAt,
      program_courses: p.programCourses.map((pc) => ({
        id: pc.id,
        sort_order: pc.sortOrder,
        is_required: pc.isRequired,
        courses: pc.course
          ? {
              id: pc.course.id,
              title: pc.course.title,
              slug: pc.course.slug,
              description: pc.course.description,
              hero_image: pc.course.heroImage,
              category: pc.course.category,
              level: pc.course.level,
              estimated_hours: pc.course.estimatedHours,
              students: pc.course.students,
              rating: pc.course.rating ? Number(pc.course.rating) : null,
            }
          : null,
      })),
    }))

    return NextResponse.json({ data: formatted })
  } catch (err: any) {
    console.error('Error fetching programs:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch programs' },
      { status: 500 }
    )
  }
}