import { NextResponse } from 'next/server'
import { db } from '@/db'
import { courses } from '@/db/schema'
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

        const course = await db.query.courses.findFirst({
            where: eq(courses.slug, slug),
            with: {
                lessons: {
                    orderBy: (lessons, { asc }) => [asc(lessons.stepOrder)],
                },
                media: true,
            },
        })

        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 })
        }

        // Return unified payload supporting both camelCase and snake_case
        const formatted = {
            ...course,
            hero_image: course.heroImage || '/assets/images/default.jpg',
            estimated_hours: course.estimatedHours || 0,
            is_paid: Boolean(course.isPaid),
            course_media: course.media || [],
            lessons: (course.lessons || []).map((lesson) => ({
                ...lesson,
                estimated_time: lesson.estimatedTime,
                step_order: lesson.stepOrder,
                video_url: lesson.videoUrl,
            })),
        }

        return NextResponse.json(formatted)
    } catch (err: any) {
        console.error('Error fetching course by slug:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to fetch course' },
            { status: 500 }
        )
    }
}

