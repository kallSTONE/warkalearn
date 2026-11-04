import { NextResponse } from 'next/server'
import { db } from '@/db'
import { courses, lessons, courseMedia, lessonDownloads } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const courseList = await db.query.courses.findMany({
            orderBy: [desc(courses.createdAt)],
            with: {
                lessons: {
                    orderBy: (lessons, { asc }) => [asc(lessons.stepOrder)],
                },
                media: true,
            },
        })

        return NextResponse.json(courseList)
    } catch (err: any) {
        console.error('Error fetching admin courses:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to fetch courses' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await requireAdminRequest(request)
        if (!authResult.ok) {
            return authResult.response
        }

        const body = await request.json()

        const title = (body.title || '').trim()
        if (!title) {
            return NextResponse.json({ error: 'Course title is required' }, { status: 400 })
        }

        // Generate base slug
        let baseSlug = body.slug
            ? String(body.slug).trim().toLowerCase()
            : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

        if (!baseSlug) {
            baseSlug = 'course'
        }

        const result = await db.transaction(async (tx) => {
            // Ensure unique slug
            let slug = baseSlug
            let counter = 1
            while (true) {
                const existing = await tx.query.courses.findFirst({
                    where: eq(courses.slug, slug),
                    columns: { id: true },
                })
                if (!existing) break
                slug = `${baseSlug}-${counter}`
                counter++
            }

            // Insert course
            const [newCourse] = await tx
                .insert(courses)
                .values({
                    title,
                    slug,
                    description: body.description || '',
                    heroImage: body.hero_image || body.image || null,
                    category: body.category || 'General',
                    level: body.level || 'Beginner',
                    estimatedHours: Number(body.estimated_hours) || null,
                    requirements: body.requirements || 'Basic understanding',
                    skills: body.skills || '',
                    students: Number(body.students) || 0,
                    rating: String(body.rating || '0'),
                    featured: Boolean(body.featured),
                    published: body.published !== undefined ? Boolean(body.published) : true,
                    status: body.status || 'published',
                    isPaid: Boolean(body.is_paid),
                    price: body.is_paid ? String(body.price || '0') : null,
                })
                .returning()

            const courseId = newCourse.id

            // Insert intro media if provided
            const introUrl = (body.intro_video_url || body.introVideoUrl || '').trim()
            if (introUrl) {
                await tx.insert(courseMedia).values({
                    courseId,
                    type: 'intro',
                    provider: 'youtube',
                    url: introUrl,
                })
            }

            // Insert lessons if provided
            const lessonsInput = Array.isArray(body.lessons) ? body.lessons : []
            if (lessonsInput.length > 0) {
                for (let idx = 0; idx < lessonsInput.length; idx++) {
                    const l = lessonsInput[idx]
                    const [insertedLesson] = await tx
                        .insert(lessons)
                        .values({
                            courseId,
                            title: l.title || `Lesson ${idx + 1}`,
                            description: l.description || '',
                            estimatedTime: Number(l.time || l.estimated_time) || null,
                            stepOrder: idx + 1,
                            topics: l.topics || {},
                            videoUrl: l.video_url || 'https://www.youtube.com/watch?v=lEOad0pBh9s',
                        })
                        .returning({ id: lessons.id })

                    // Insert downloads for this lesson if provided
                    const downloads = Array.isArray(l.downloads) ? l.downloads : []
                    if (downloads.length > 0) {
                        for (const d of downloads) {
                            if (d.title && d.file_url) {
                                await tx.insert(lessonDownloads).values({
                                    lessonId: insertedLesson.id,
                                    title: d.title,
                                    description: d.description || null,
                                    fileUrl: d.file_url,
                                    fileType: d.file_type || 'pdf',
                                    fileSize: Number(d.file_size) || null,
                                })
                            }
                        }
                    }
                }
            }

            return newCourse
        })

        return NextResponse.json({
            success: true,
            course: result,
        })
    } catch (err: any) {
        console.error('Error creating course:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to create course' },
            { status: 500 }
        )
    }
}
