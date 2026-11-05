import { NextResponse } from 'next/server'
import { db } from '@/db'
import { programs } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    const program = await db.query.programs.findFirst({
      where: eq(programs.slug, slug),
      with: {
        programCourses: {
          orderBy: (pc, { asc }) => [asc(pc.sortOrder)],
          with: {
            course: true,
          },
        },
      },
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const formatted = {
      id: program.id,
      title: program.title,
      slug: program.slug,
      description: program.description,
      status: program.status,
      thumbnail: program.thumbnail,
      price: program.price ? Number(program.price) : null,
      created_at: program.createdAt,
      program_courses: program.programCourses.map((pc) => ({
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
    }

    return NextResponse.json({ data: formatted })
  } catch (err: any) {
    console.error('Error fetching program by slug:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch program' },
      { status: 500 }
    )
  }
}

