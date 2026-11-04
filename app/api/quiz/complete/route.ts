import { NextResponse } from 'next/server'
import { db } from '@/db'
import {
    lessons,
    lessonQuizCompletions,
    courseEnrollments,
    courseProgress,
} from '@/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { authenticateRequest } from '@/lib/server/api-auth'
import { markCourseCompleted } from '@/lib/programProgress'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const authResult = await authenticateRequest(request)
        if (!authResult.ok) {
            return authResult.response
        }

        const userId = authResult.context.userId
        const body = await request.json()
        const { lessonId, quizId } = body || {}

        const numericLessonId = Number(lessonId)
        if (!numericLessonId || isNaN(numericLessonId)) {
            return NextResponse.json({ error: 'Valid lessonId is required' }, { status: 400 })
        }

        // 1. Fetch lesson to get courseId
        const lesson = await db.query.lessons.findFirst({
            where: eq(lessons.id, numericLessonId),
            columns: { id: true, courseId: true },
        })

        if (!lesson) {
            return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
        }

        const courseId = lesson.courseId

        // 2. Insert quiz completion (idempotent)
        if (quizId) {
            await db
                .insert(lessonQuizCompletions)
                .values({
                    userId,
                    lessonId: numericLessonId,
                    quizId: String(quizId),
                })
                .onConflictDoNothing()
        }

        // 3. Find user's enrollment for this course
        const enrollment = await db.query.courseEnrollments.findFirst({
            where: and(
                eq(courseEnrollments.userId, userId),
                eq(courseEnrollments.courseId, courseId)
            ),
            columns: { id: true },
        })

        if (!enrollment) {
            return NextResponse.json({ success: true, completed: false })
        }

        // 4. Calculate progress based on completed lessons
        const allLessons = await db.query.lessons.findMany({
            where: eq(lessons.courseId, courseId),
            columns: { id: true },
        })

        const totalLessons = allLessons.length
        if (totalLessons === 0) {
            return NextResponse.json({ success: true, progressPercentage: 100 })
        }

        const lessonIds = allLessons.map((l) => l.id)
        const userCompletions = await db.query.lessonQuizCompletions.findMany({
            where: and(
                eq(lessonQuizCompletions.userId, userId),
                inArray(lessonQuizCompletions.lessonId, lessonIds)
            ),
            columns: { lessonId: true },
        })

        const completedCount = new Set(userCompletions.map((c) => c.lessonId)).size
        const progressPercentage = Math.min(100, Math.round((completedCount / totalLessons) * 100))
        const isCompleted = progressPercentage === 100
        const now = new Date()

        const existingProgress = await db.query.courseProgress.findFirst({
            where: eq(courseProgress.enrollmentId, enrollment.id),
        })

        if (existingProgress) {
            await db
                .update(courseProgress)
                .set({
                    progressPercentage,
                    completed: isCompleted,
                    completedAt: isCompleted ? now : existingProgress.completedAt,
                    lastAccessed: now,
                    updatedAt: now,
                })
                .where(eq(courseProgress.enrollmentId, enrollment.id))
        } else {
            await db.insert(courseProgress).values({
                enrollmentId: enrollment.id,
                progressPercentage,
                completed: isCompleted,
                completedAt: isCompleted ? now : null,
                lastAccessed: now,
                updatedAt: now,
            })
        }

        if (isCompleted) {
            await markCourseCompleted(userId, courseId)
        }

        return NextResponse.json({
            success: true,
            progressPercentage,
            completed: isCompleted,
        })
    } catch (err: any) {
        console.error('Record quiz completion error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to record quiz completion' },
            { status: 500 }
        )
    }
}

