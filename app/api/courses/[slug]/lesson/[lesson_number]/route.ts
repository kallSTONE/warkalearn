import { NextResponse } from 'next/server'
import { db } from '@/db'
import {
    courses,
    lessons,
    lessonDownloads,
    quizzes,
    quizQuestions,
    lessonQuizCompletions,
    certificationSettings,
} from '@/db/schema'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { authenticateRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: { slug: string; lesson_number: string } }
) {
    try {
        const authResult = await authenticateRequest(request)
        if (!authResult.ok) {
            return authResult.response
        }

        const userId = authResult.context.userId
        const { slug, lesson_number } = params
        const stepOrder = Number(lesson_number)

        if (!stepOrder || isNaN(stepOrder)) {
            return NextResponse.json({ error: 'Valid lesson number required' }, { status: 400 })
        }

        // 1. Fetch course with all lessons
        const course = await db.query.courses.findFirst({
            where: eq(courses.slug, slug),
            with: {
                lessons: {
                    orderBy: (l, { asc }) => [asc(l.stepOrder)],
                },
            },
        })

        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 })
        }

        const allLessons = course.lessons || []
        const currentLesson = allLessons.find((l) => l.stepOrder === stepOrder)

        if (!currentLesson) {
            return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
        }

        const lessonIds = allLessons.map((l) => l.id)

        // 2. Fetch completions for all lessons in this course
        const completions = lessonIds.length > 0
            ? await db.query.lessonQuizCompletions.findMany({
                where: and(
                    eq(lessonQuizCompletions.userId, userId),
                    inArray(lessonQuizCompletions.lessonId, lessonIds)
                ),
                columns: { lessonId: true },
            })
            : []

        const completedSet = new Set(completions.map((c) => c.lessonId))

        // 3. Check certification setting
        const certSetting = await db.query.certificationSettings.findFirst({
            where: eq(certificationSettings.courseId, course.id),
            columns: { enabled: true },
        })

        // 4. Fetch downloads for current lesson
        const downloads = await db.query.lessonDownloads.findMany({
            where: eq(lessonDownloads.lessonId, currentLesson.id),
            orderBy: [desc(lessonDownloads.modifiedAt)],
        })

        // 5. Fetch quiz and questions for current lesson
        const quiz = await db.query.quizzes.findFirst({
            where: eq(quizzes.lessonId, currentLesson.id),
        })

        let questions: any[] = []
        let quizCompleted = false

        if (quiz) {
            const qq = await db.query.quizQuestions.findFirst({
                where: eq(quizQuestions.quizId, quiz.id),
            })
            if (qq && Array.isArray(qq.questions)) {
                questions = qq.questions
            }

            quizCompleted = completedSet.has(currentLesson.id)
        }

        const formattedCourse = {
            id: course.id,
            title: course.title,
            slug: course.slug,
            courseId: course.id,
            lessons: allLessons.map((l) => ({
                id: String(l.id),
                title: l.title,
                number: l.stepOrder,
                completed: completedSet.has(l.id),
                progress: completedSet.has(l.id) ? 100 : 0,
            })),
        }

        const formattedLesson = {
            id: currentLesson.id,
            title: currentLesson.title,
            description: currentLesson.description || '',
            summary: currentLesson.description || '',
            videoUrl: currentLesson.videoUrl || '',
            step_order: currentLesson.stepOrder,
            topics: currentLesson.topics || {},
        }

        return NextResponse.json({
            courseData: formattedCourse,
            currentLesson: formattedLesson,
            downloads,
            quiz: quiz ? { id: quiz.id, is_required: quiz.isRequired } : null,
            questions,
            quizCompleted,
            hasCertification: Boolean(certSetting?.enabled),
        })
    } catch (err: any) {
        console.error('Fetch lesson data error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to fetch lesson data' },
            { status: 500 }
        )
    }
}

