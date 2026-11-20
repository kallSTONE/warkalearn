import { NextResponse } from 'next/server'
import { db, ensureSchemaSynced } from '@/db'
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
import { and, asc, desc, eq, inArray, isNull, gte, sql } from 'drizzle-orm'
import { authenticateRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        await ensureSchemaSynced()
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
                    estimatedTime: true,
                },
            })
            : []

        const allCompletions = courseIds.length > 0
            ? await db.query.lessonQuizCompletions.findMany({
                where: and(
                    eq(lessonQuizCompletions.userId, userId),
                    inArray(
                        lessonQuizCompletions.lessonId,
                        allCourseLessons.map((l) => l.id)
                    )
                ),
                columns: { lessonId: true },
            })
            : []

        const completedLessonIds = new Set(allCompletions.map((c) => c.lessonId))

        // Group lessons by course
        const lessonsByCourse = new Map<number, typeof allCourseLessons>()
        allCourseLessons.forEach((l) => {
            const list = lessonsByCourse.get(l.courseId) ?? []
            list.push(l)
            lessonsByCourse.set(l.courseId, list)
        })

        // 4. Format enrolled courses
        const enrolledCourses = enrollments.map((enrollment) => {
            const course = enrollment.course
            const progress = progressMap.get(enrollment.id)
            const courseLessons = lessonsByCourse.get(enrollment.courseId) ?? []

            const totalLessons = courseLessons.length
            const completedLessons = courseLessons.filter((l) => completedLessonIds.has(l.id)).length
            const progressPct = totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : Number(progress?.progressPercentage || 0)

            // Find next uncompleted lesson, or fall back to first lesson
            const firstLesson = courseLessons[0]
            const nextLesson = courseLessons.find((l) => !completedLessonIds.has(l.id)) || firstLesson

            const firstLessonId = nextLesson?.id || firstLesson?.id || null
            const nextLessonTitle = nextLesson?.title || firstLesson?.title || null
            const enrolledAtIso = enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toISOString() : ''

            return {
                id: enrollment.id,
                enrollment_id: enrollment.id,
                courseId: enrollment.courseId,
                title: course?.title || 'Untitled Course',
                slug: course?.slug || '',
                description: course?.description || '',
                heroImage: course?.heroImage || '/assets/images/default.jpg',
                category: course?.category || 'General',
                level: course?.level || 'Beginner',
                estimatedHours: course?.estimatedHours || 0,
                enrolledAt: enrolledAtIso,
                enrolled_at: enrolledAtIso,
                progress: progressPct,
                progressPercentage: progressPct,
                completed: progress?.completed || progressPct >= 100,
                totalLessons,
                completedLessons,
                firstLessonId,
                nextLessonTitle,
                nextLesson: nextLesson ? {
                    id: nextLesson.id,
                    stepOrder: nextLesson.stepOrder,
                    title: nextLesson.title,
                } : null,
                course: {
                    id: course?.id ?? enrollment.courseId,
                    title: course?.title || 'Untitled Course',
                    slug: course?.slug || '',
                    hero_image: course?.heroImage || '/assets/images/default.jpg',
                    estimated_hours: course?.estimatedHours || 0,
                },
            }
        })

        // 5. Fetch certificates
        const userCertificates = await db.query.certificates.findMany({
            where: eq(certificates.userId, userId),
            orderBy: [desc(certificates.issuedAt)],
            with: {
                course: true,
            },
        })

        const formattedCertificates = userCertificates.map((cert) => ({
            id: cert.id,
            certificateCode: cert.certificateCode,
            courseTitle: cert.course?.title || 'Course Certificate',
            courseSlug: cert.course?.slug || '',
            issuedAt: cert.issuedAt,
            pdfUrl: cert.pdfUrl,
        }))

        // 6. Fetch live class registrations
        const registrations = await db.query.liveClassRegistrations.findMany({
            where: eq(liveClassRegistrations.userId, userId),
            orderBy: [desc(liveClassRegistrations.createdAt)],
            with: {
                liveClass: true,
            },
        })

        const formattedLiveClasses = registrations.map((reg) => ({
            id: reg.id,
            liveClassId: reg.liveClassId,
            title: reg.liveClass?.title || 'Live Session',
            startAt: reg.liveClass?.startAt ? new Date(reg.liveClass.startAt).toISOString() : '',
            platform: reg.liveClass?.meetingPlatform || 'Online',
            meetingUrl: reg.liveClass?.meetingUrl || null,
            paymentStatus: reg.paymentStatus || 'paid',
            registrationStatus: reg.registrationStatus || 'registered',
            status: reg.registrationStatus,
            registeredAt: reg.createdAt,
            liveClass: reg.liveClass ? {
                id: reg.liveClass.id,
                title: reg.liveClass.title,
                instructorName: reg.liveClass.instructorName,
                scheduledAt: reg.liveClass.startAt,
                durationMinutes: reg.liveClass.endAt ? Math.round((new Date(reg.liveClass.endAt).getTime() - new Date(reg.liveClass.startAt).getTime()) / 60000) : 60,
                meetingUrl: reg.liveClass.meetingUrl,
                status: reg.liveClass.status,
            } : null,
        }))

        // 7. Community activity & discussions
        const recentTopics = await db.query.forumTopics.findMany({
            orderBy: [desc(forumTopics.updatedAt)],
            limit: 4,
            with: {
                posts: {
                    orderBy: [desc(forumPosts.createdAt)],
                    limit: 1,
                },
            },
        }).catch(() => [])

        const discussionUpdates = recentTopics.map((topic) => ({
            id: topic.id,
            title: topic.title,
            latestReply: topic.posts?.[0]?.content?.slice(0, 100) || 'Active discussion thread',
            replies: topic.posts?.length || 0,
        }))

        // 8. Upcoming events (live classes)
        const upcomingLiveClasses = await db.query.liveClasses.findMany({
            where: and(
                eq(liveClasses.status, 'published'),
                gte(liveClasses.startAt, new Date())
            ),
            orderBy: (lc, { asc }) => [asc(lc.startAt)],
            limit: 4,
        }).catch(() => [])

        const upcomingEvents = upcomingLiveClasses.map((lc) => {
            const durationMs = lc.endAt && lc.startAt
                ? new Date(lc.endAt).getTime() - new Date(lc.startAt).getTime()
                : 3600000
            const durationMins = Math.max(15, Math.round(durationMs / 60000))

            return {
                id: lc.id,
                title: lc.title,
                date: lc.startAt ? new Date(lc.startAt).toISOString() : new Date().toISOString(),
                duration: `${durationMins} min`,
            }
        })

        const recentPosts = await db.query.forumPosts.findMany({
            where: eq(forumPosts.userId, userId),
            orderBy: [desc(forumPosts.createdAt)],
            limit: 5,
            with: {
                topic: true,
            },
        }).catch(() => [])

        const formattedPosts = recentPosts.map((p) => ({
            id: p.id,
            content: p.content,
            createdAt: p.createdAt,
            topicTitle: p.topic?.title || 'Forum Discussion',
        }))

        // 9. Overall student statistics
        const completedCoursesCount = enrolledCourses.filter((c) => c.completed).length
        const inProgressCoursesCount = enrolledCourses.filter((c) => !c.completed).length
        const averageProgress = enrolledCourses.length > 0
            ? Math.round(enrolledCourses.reduce((sum, c) => sum + c.progressPercentage, 0) / enrolledCourses.length)
            : 0

        const totalLearningHours = enrolledCourses.reduce(
            (acc, curr) => acc + (Number(curr.estimatedHours) || 0),
            0
        )

        return NextResponse.json({
            courses: enrolledCourses,
            enrolledCourses,
            stats: {
                coursesInProgress: inProgressCoursesCount,
                certificatesEarned: formattedCertificates.length,
                learningHours: totalLearningHours,
                forumPosts: formattedPosts.length,
                totalEnrolled: enrolledCourses.length,
                completedCourses: completedCoursesCount,
                inProgressCourses: inProgressCoursesCount,
                averageProgress,
                certificatesCount: formattedCertificates.length,
                liveClassesCount: formattedLiveClasses.length,
            },
            certificates: formattedCertificates,
            liveClasses: formattedLiveClasses,
            liveSchedules: formattedLiveClasses,
            discussionUpdates,
            upcomingEvents,
            recentPosts: formattedPosts,
        })
    } catch (err: any) {
        console.error('Student dashboard error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to load student dashboard' },
            { status: 500 }
        )
    }
}
