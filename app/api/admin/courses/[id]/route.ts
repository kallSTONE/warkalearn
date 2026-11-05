import { NextResponse } from 'next/server'
import { db, ensureSchemaSynced } from '@/db'
import { courses, lessons, courseMedia, lessonDownloads, courseReviewNotes } from '@/db/schema'
import { asc, desc, eq, inArray, notInArray } from 'drizzle-orm'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchemaSynced()
    const authResult = await requireAdminRequest(request)
    if (!authResult.ok) {
      return authResult.response
    }

    const courseId = Number(params.id)
    if (!courseId || isNaN(courseId)) {
      return NextResponse.json({ error: 'Valid course ID required' }, { status: 400 })
    }

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Lessons with downloads
    const lessonList = await db.query.lessons.findMany({
      where: eq(lessons.courseId, courseId),
      orderBy: [asc(lessons.stepOrder)],
      with: {
        downloads: true,
      },
    })

    // Course media
    const mediaList = await db.query.courseMedia.findMany({
      where: eq(courseMedia.courseId, courseId),
    })

    // Reviewer notes
    const reviewNotes = await db.query.courseReviewNotes.findMany({
      where: eq(courseReviewNotes.courseId, courseId),
      orderBy: [desc(courseReviewNotes.createdAt)],
    })

    const introMedia = mediaList.find((m) => m.type === 'intro') ?? null

    const formattedCourse = {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      hero_image: course.heroImage,
      category: course.category,
      level: course.level,
      estimated_hours: course.estimatedHours,
      requirements: course.requirements,
      skills: course.skills,
      students: course.students,
      rating: Number(course.rating ?? 0),
      featured: course.featured,
      published: course.published,
      status: course.status,
      is_paid: course.isPaid,
      price: Number(course.price ?? 0),
      created_at: course.createdAt?.toISOString(),
    }

    const formattedLessons = lessonList.map((l) => ({
      id: l.id,
      course_id: l.courseId,
      title: l.title,
      description: l.description,
      estimated_time: l.estimatedTime,
      step_order: l.stepOrder,
      topics: l.topics,
      video_url: l.videoUrl,
      lesson_downloads: (l.downloads || []).map((d) => ({
        id: d.id,
        lesson_id: d.lessonId,
        title: d.title,
        description: d.description,
        file_url: d.fileUrl,
        file_type: d.fileType,
        file_size: d.fileSize,
      })),
      downloads: (l.downloads || []).map((d) => ({
        id: d.id,
        lesson_id: d.lessonId,
        title: d.title,
        description: d.description,
        file_url: d.fileUrl,
        file_type: d.fileType,
        file_size: d.fileSize,
      })),
    }))

    const formattedNotes = reviewNotes.map((n) => ({
      id: n.id,
      content: n.content,
      status: n.status,
      reviewer_id: n.reviewerId,
      created_at: n.createdAt.toISOString(),
      addressed: n.addressed,
    }))

    return NextResponse.json({
      course: formattedCourse,
      lessons: formattedLessons,
      media: mediaList,
      introMedia: introMedia ? { id: introMedia.id, url: introMedia.url } : null,
      reviewNotes: formattedNotes,
    })
  } catch (err: any) {
    console.error('Fetch admin course error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to load course' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchemaSynced()
    const authResult = await requireAdminRequest(request)
    if (!authResult.ok) {
      return authResult.response
    }

    const courseId = Number(params.id)
    if (!courseId || isNaN(courseId)) {
      return NextResponse.json({ error: 'Valid course ID required' }, { status: 400 })
    }

    const body = await request.json()
    const {
      title,
      slug,
      description,
      hero_image,
      category,
      level,
      estimated_hours,
      requirements,
      skills,
      featured,
      is_paid,
      price,
      students,
      rating,
      published,
      status,
      introVideoUrl,
      lessons: incomingLessons,
      deletedLessonIds,
    } = body

    await db.transaction(async (tx) => {
      // 1. Update Course details
      await tx
        .update(courses)
        .set({
          title: title ?? '',
          slug: slug ?? '',
          description: description ?? null,
          heroImage: hero_image ?? null,
          category: category ?? null,
          level: level ?? null,
          estimatedHours: estimated_hours !== undefined ? Number(estimated_hours) : null,
          requirements: requirements ?? null,
          skills: skills ?? null,
          featured: Boolean(featured),
          isPaid: Boolean(is_paid),
          price: price !== undefined && price !== null ? String(price) : null,
          students: students !== undefined ? Number(students) : 0,
          rating: rating !== undefined ? String(rating) : '0',
          published: published !== undefined ? Boolean(published) : undefined,
          status: status ?? undefined,
        })
        .where(eq(courses.id, courseId))

      // 2. Intro Video media
      if (typeof introVideoUrl === 'string') {
        const trimmedIntro = introVideoUrl.trim()
        const existingIntro = await tx.query.courseMedia.findFirst({
          where: eq(courseMedia.courseId, courseId),
        })

        if (trimmedIntro) {
          if (existingIntro && existingIntro.type === 'intro') {
            await tx
              .update(courseMedia)
              .set({ url: trimmedIntro, provider: 'youtube' })
              .where(eq(courseMedia.id, existingIntro.id))
          } else {
            await tx.insert(courseMedia).values({
              courseId,
              type: 'intro',
              provider: 'youtube',
              url: trimmedIntro,
            })
          }
        } else if (existingIntro && existingIntro.type === 'intro') {
          await tx.delete(courseMedia).where(eq(courseMedia.id, existingIntro.id))
        }
      }

      // 3. Delete lessons explicitly removed
      if (Array.isArray(deletedLessonIds) && deletedLessonIds.length > 0) {
        await tx.delete(lessons).where(inArray(lessons.id, deletedLessonIds))
      }

      // 4. Update / Insert Lessons & Downloads
      if (Array.isArray(incomingLessons)) {
        for (let idx = 0; idx < incomingLessons.length; idx++) {
          const l = incomingLessons[idx]
          let lessonId = l.id ? Number(l.id) : null

          // Build topics object
          const topicsObj: Record<string, string> = {}
          if (Array.isArray(l.topicsArr)) {
            l.topicsArr.forEach((t: any) => {
              if (t.key && t.key.trim() !== '') {
                topicsObj[t.key] = t.value ?? ''
              }
            })
          } else if (l.topics && typeof l.topics === 'object' && !Array.isArray(l.topics)) {
            Object.assign(topicsObj, l.topics)
          }

          if (lessonId) {
            // Update existing lesson
            await tx
              .update(lessons)
              .set({
                title: l.title ?? '',
                description: l.description ?? null,
                estimatedTime: l.estimated_time !== undefined ? Number(l.estimated_time) : null,
                stepOrder: l.step_order !== undefined ? Number(l.step_order) : idx + 1,
                topics: Object.keys(topicsObj).length > 0 ? topicsObj : null,
                videoUrl: l.video_url ?? null,
              })
              .where(eq(lessons.id, lessonId))
          } else {
            // Insert new lesson
            const [inserted] = await tx
              .insert(lessons)
              .values({
                courseId,
                title: l.title ?? `Lesson ${idx + 1}`,
                description: l.description ?? null,
                estimatedTime: l.estimated_time !== undefined ? Number(l.estimated_time) : null,
                stepOrder: l.step_order !== undefined ? Number(l.step_order) : idx + 1,
                topics: Object.keys(topicsObj).length > 0 ? topicsObj : null,
                videoUrl: l.video_url ?? null,
              })
              .returning({ id: lessons.id })

            lessonId = inserted.id
          }

          // Sync Downloads for this lesson
          const downloads = Array.isArray(l.downloads)
            ? l.downloads
            : Array.isArray(l.lesson_downloads)
            ? l.lesson_downloads
            : []

          const keptDownloadIds = downloads
            .filter((d: any) => d.id)
            .map((d: any) => d.id)

          if (keptDownloadIds.length > 0) {
            await tx
              .delete(lessonDownloads)
              .where(
                notInArray(lessonDownloads.id, keptDownloadIds)
              )
          } else {
            await tx
              .delete(lessonDownloads)
              .where(eq(lessonDownloads.lessonId, lessonId))
          }

          for (const d of downloads) {
            if (d.id) {
              await tx
                .update(lessonDownloads)
                .set({
                  title: d.title ?? '',
                  description: d.description || null,
                  fileUrl: d.file_url ?? '',
                  fileType: d.file_type ?? 'file',
                  fileSize: d.file_size !== undefined ? Number(d.file_size) : 0,
                })
                .where(eq(lessonDownloads.id, d.id))
            } else if (d.file_url) {
              await tx.insert(lessonDownloads).values({
                lessonId,
                title: d.title ?? 'Download',
                description: d.description || null,
                fileUrl: d.file_url,
                fileType: d.file_type ?? 'file',
                fileSize: d.file_size !== undefined ? Number(d.file_size) : 0,
              })
            }
          }
        }
      }
    })

    return NextResponse.json({ success: true, courseId })
  } catch (err: any) {
    console.error('Update admin course error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to update course' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchemaSynced()
    const authResult = await requireAdminRequest(request)
    if (!authResult.ok) {
      return authResult.response
    }

    const body = await request.json()
    const { noteId, addressed } = body

    if (noteId) {
      await db
        .update(courseReviewNotes)
        .set({ addressed: Boolean(addressed), updatedAt: new Date() })
        .where(eq(courseReviewNotes.id, noteId))

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Note ID required' }, { status: 400 })
  } catch (err: any) {
    console.error('Update note error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to update note' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchemaSynced()
    const authResult = await requireAdminRequest(request)
    if (!authResult.ok) {
      return authResult.response
    }

    const courseId = Number(params.id)
    if (!courseId || isNaN(courseId)) {
      return NextResponse.json({ error: 'Valid course ID required' }, { status: 400 })
    }

    await db.delete(courses).where(eq(courses.id, courseId))

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Delete admin course error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to delete course' },
      { status: 500 }
    )
  }
}

