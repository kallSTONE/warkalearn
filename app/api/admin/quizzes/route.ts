import { NextResponse } from 'next/server'
import { db } from '@/db'
import { quizzes, quizQuestions, courses, lessons } from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const authResult = await requireAdminRequest(request)
        if (!authResult.ok) {
            return authResult.response
        }

        const { searchParams } = new URL(request.url)
        const lessonIdParam = searchParams.get('lessonId')
        const courseIdParam = searchParams.get('courseId')

        if (lessonIdParam) {
            const lessonId = Number(lessonIdParam)
            const quiz = await db.query.quizzes.findFirst({
                where: eq(quizzes.lessonId, lessonId),
            })

            let questions: any[] = []
            if (quiz) {
                const qq = await db.query.quizQuestions.findFirst({
                    where: eq(quizQuestions.quizId, quiz.id),
                })
                if (qq && Array.isArray(qq.questions)) {
                    questions = qq.questions
                }
            }

            return NextResponse.json({
                quiz: quiz ? { id: quiz.id, is_required: quiz.isRequired } : null,
                questions,
            })
        }

        if (courseIdParam) {
            const courseId = Number(courseIdParam)
            const course = await db.query.courses.findFirst({
                where: eq(courses.id, courseId),
                with: {
                    lessons: {
                        orderBy: (l, { asc }) => [asc(l.stepOrder)],
                    },
                    quizzes: true,
                },
            })

            return NextResponse.json(course || null)
        }

        // Return all courses with lessons for quiz admin overview
        const allCourses = await db.query.courses.findMany({
            orderBy: [desc(courses.createdAt)],
            with: {
                lessons: {
                    orderBy: (l, { asc }) => [asc(l.stepOrder)],
                },
                quizzes: true,
            },
        })

        return NextResponse.json(allCourses)
    } catch (err: any) {
        console.error('Admin quizzes GET error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to fetch quizzes' },
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
        const { lessonId, courseId, isRequired, questions: questionsInput } = body || {}

        const numericLessonId = Number(lessonId)
        const numericCourseId = Number(courseId)

        if (!numericLessonId || !numericCourseId) {
            return NextResponse.json({ error: 'Valid lessonId and courseId are required' }, { status: 400 })
        }

        const result = await db.transaction(async (tx) => {
            // Find or create quiz
            let quiz = await tx.query.quizzes.findFirst({
                where: eq(quizzes.lessonId, numericLessonId),
            })

            if (quiz) {
                const [updated] = await tx
                    .update(quizzes)
                    .set({
                        isRequired: Boolean(isRequired),
                    })
                    .where(eq(quizzes.id, quiz.id))
                    .returning()
                quiz = updated
            } else {
                const [created] = await tx
                    .insert(quizzes)
                    .values({
                        lessonId: numericLessonId,
                        courseId: numericCourseId,
                        isRequired: Boolean(isRequired),
                    })
                    .returning()
                quiz = created
            }

            // Upsert quiz questions
            const existingQQ = await tx.query.quizQuestions.findFirst({
                where: eq(quizQuestions.quizId, quiz.id),
            })

            const cleanQuestions = Array.isArray(questionsInput) ? questionsInput : []

            if (existingQQ) {
                await tx
                    .update(quizQuestions)
                    .set({
                        questions: cleanQuestions,
                    })
                    .where(eq(quizQuestions.id, existingQQ.id))
            } else {
                await tx.insert(quizQuestions).values({
                    quizId: quiz.id,
                    questions: cleanQuestions,
                })
            }

            return quiz
        })

        return NextResponse.json({
            success: true,
            quiz: result,
        })
    } catch (err: any) {
        console.error('Admin quizzes POST error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to save quiz' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request) {
    try {
        const authResult = await requireAdminRequest(request)
        if (!authResult.ok) {
            return authResult.response
        }

        const { searchParams } = new URL(request.url)
        const quizId = searchParams.get('quizId')

        if (!quizId) {
            return NextResponse.json({ error: 'quizId is required' }, { status: 400 })
        }

        await db.delete(quizzes).where(eq(quizzes.id, quizId))

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Admin quizzes DELETE error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to delete quiz' },
            { status: 500 }
        )
    }
}

