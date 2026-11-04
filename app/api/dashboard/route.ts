import { NextResponse } from 'next/server'
import { db } from '@/db'
import {
    courseEnrollments,
    courseProgress,
    courses,
    lessons,
    lessonQuizCompletions,
    certificates,
    forumPosts,
    forumTopics,
    certificationAttempts,
    liveClassRegistrations,
    liveClasses,
} from '@/db/schema'
import { and, desc, eq, inArray, isNull, gte, sql } from 'drizzle-orm'
import { authenticateRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const authResult = await authenticateRequest(request)
        if (!authResult.ok) {
            return authResult.response
        }

        const userId = authResult.context.userId

        // 1. Fetch user's enrollments with course details
        const enrollments = await db.query.courseEnrollments.findMany({
            where: eq(courseEnrollments.userId, userId),
            orderBy: [desc(courseEnrollments.enrolledAt)],
            with: {
                course: true,
            },
        })

        const enrollmentIds = enrollments.map((e) => e.id)
        const courseIds = enrollments.map((e) => e.courseId)

        // 2. Fetch progress for all enrollments in parallel
        const progressList = enrollmentIds.length > 0
            ? await db.query.courseProgress.findMany({
                where: inArray(courseProgress.enrollmentId, enrollmentIds),
            })
            : []

        const progressMap = new Map(progressList.map((p) => [p.enrollmentId, p]))

        // 3. Fetch lessons and completions for enrolled courses
        const allCourseLessons = courseIds.length > 0
            ? await db.query.lessons.findMany({
                where: inArray(lessons.courseId, courseIds),
                orderBy: (lessons, { asc }) => [asc(lessons.stepOrder)],
                columns: {
                    id: true,
                    courseId: true,
                    title: true,
                    stepOrder: true,
                },
            })
            : []

        const allCompletions = await db.query.lessonQuizCompletions.findMany({
            where: eq(lessonQuizCompletions.userId, userId),
            columns: {
                lessonId: true,
            },
        })

        const completedLessonSet = new Set(allCompletions.map((c) => c.lessonId))

        // Group lessons by courseId
        const courseLessonsMap = new Map<number, typeof allCourseLessons>()
        for (const l of allCourseLessons) {
            const list = courseLessonsMap.get(l.courseId) || []
            list.push(l)
            courseLessonsMap.set(l.courseId, list)
        }

        // Format enrolled courses
        const formattedCourses = enrollments.map((enrollment) => {
            const progressRow = progressMap.get(enrollment.id)
            const cLessons = courseLessonsMap.get(enrollment.courseId) || []
            const firstIncomplete = cLessons.find((l) => !completedLessonSet.has(l.id)) || null

            return {
                enrollment_id: enrollment.id,
                enrolled_at: enrollment.enrolledAt?.toISOString() || new Date().toISOString(),
                progress: progressRow?.progressPercentage ?? 0,
                completed: progressRow?.completed ?? false,
                course: {
                    id: enrollment.course.id,
                    title: enrollment.course.title,
                    slug: enrollment.course.slug,
                    hero_image: enrollment.course.heroImage || null,
                    estimated_hours: enrollment.course.estimatedHours || null,
                },
                firstLessonId: firstIncomplete?.stepOrder ?? null,
                nextLessonTitle: firstIncomplete?.title ?? null,
            }
        })

        // 4. Calculate Stats
        const coursesInProgress = formattedCourses.filter(
            (c) => !c.completed && c.progress < 100
        ).length

        const learningHours = Number(
            formattedCourses
                .reduce((total, c) => total + ((c.course.estimated_hours ?? 0) * c.progress) / 100, 0)
                .toFixed(1)
        )

        // Count certificates
        let certificatesCount = 0
        try {
            const certs = await db
                .select({ count: sql<number>`count(*)` })
                .from(certificates)
                .where(and(eq(certificates.userId, userId), isNull(certificates.revokedAt)))
            certificatesCount = Number(certs[0]?.count ?? 0)
        } catch {
            // certificates table might be empty or unmigrated
        }

        // Count forum posts
        let forumPostsCount = 0
        try {
            const posts = await db
                .select({ count: sql<number>`count(*)` })
                .from(forumPosts)
                .where(eq(forumPosts.userId, userId))
            forumPostsCount = Number(posts[0]?.count ?? 0)
        } catch {
            // forumPosts might be empty
        }

        // 5. Secondary widgets: Discussions, Upcoming Events, Live Schedules
        let discussionUpdates: any[] = []
        try {
            const topics = await db.query.forumTopics.findMany({
                where: eq(forumTopics.userId, userId),
                orderBy: [desc(forumTopics.updatedAt)],
                limit: 4,
                columns: {
                    id: true,
                    title: true,
                },
            })

            discussionUpdates = topics.map((t) => ({
                id: t.id,
                title: t.title,
                latestReply: 'Recent reply',
                replies: 0,
            }))
        } catch {
            // Ignore
        }

        let upcomingEvents: any[] = []
        try {
            const now = new Date()
            const retries = await db.query.certificationAttempts.findMany({
                where: and(
                    eq(certificationAttempts.userId, userId),
                    gte(certificationAttempts.nextRetryAt, now)
                ),
                limit: 3,
                with: {
                    course: {
                        columns: { title: true },
                    },
                },
            })

            upcomingEvents = retries.map((r) => ({
                id: r.id,
                title: `${(r as any).course?.title || 'Course'} Certification Retake`,
                date: r.nextRetryAt ? r.nextRetryAt.toISOString() : '',
                duration: '60 min',
            }))
        } catch {
            // Ignore
        }

        let liveSchedules: any[] = []
        try {
            const liveRegs = await db.query.liveClassRegistrations.findMany({
                where: eq(liveClassRegistrations.userId, userId),
                orderBy: [desc(liveClassRegistrations.createdAt)],
                with: {
                    liveClass: true,
                },
            })

            liveSchedules = liveRegs.map((reg) => ({
                id: reg.id,
                liveClassId: reg.liveClassId,
                title: reg.liveClass?.title || 'Live Class',
                startAt: reg.liveClass?.startAt ? reg.liveClass.startAt.toISOString() : '',
                platform: reg.liveClass?.meetingPlatform || 'Zoom',
                meetingUrl: reg.liveClass?.meetingUrl || null,
                paymentStatus: reg.paymentStatus || 'unpaid',
                registrationStatus: reg.registrationStatus || 'registered',
            }))
        } catch {
            // Ignore
        }

        return NextResponse.json({
            courses: formattedCourses,
            stats: {
                coursesInProgress,
                certificatesEarned: certificatesCount,
                learningHours,
                forumPosts: forumPostsCount,
            },
            discussionUpdates,
            upcomingEvents,
            liveSchedules,
        })
    } catch (err: any) {
        console.error('Dashboard data fetch error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to fetch dashboard data' },
            { status: 500 }
        )
    }
}

