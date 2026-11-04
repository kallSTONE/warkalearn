import { NextResponse } from 'next/server'
import { db } from '@/db'
import { courseEnrollments, courseProgress } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { authenticateRequest } from '@/lib/server/api-auth'
import { markCourseCompleted, markCourseIncomplete } from '@/lib/programProgress'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const authResult = await authenticateRequest(request)
        if (!authResult.ok) {
            return authResult.response
        }

        const { searchParams } = new URL(request.url)
        const courseIdParam = searchParams.get('courseId')
        const enrollmentIdParam = searchParams.get('enrollmentId')

        const userId = authResult.context.userId

        let targetEnrollmentId: string | null = null

        if (enrollmentIdParam) {
            targetEnrollmentId = enrollmentIdParam
        } else if (courseIdParam) {
            const enrollment = await db.query.courseEnrollments.findFirst({
                where: and(
                    eq(courseEnrollments.userId, userId),
                    eq(courseEnrollments.courseId, Number(courseIdParam))
                ),
                columns: { id: true },
            })
            if (enrollment) {
                targetEnrollmentId = enrollment.id
            }
        }

        if (!targetEnrollmentId) {
            return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
        }

        const progress = await db.query.courseProgress.findFirst({
            where: eq(courseProgress.enrollmentId, targetEnrollmentId),
        })

        return NextResponse.json({
            enrollmentId: targetEnrollmentId,
            progress: progress?.progressPercentage ?? 0,
            completed: progress?.completed ?? false,
            lastAccessed: progress?.lastAccessed ?? null,
            completedAt: progress?.completedAt ?? null,
        })
    } catch (err: any) {
        console.error('Fetch progress error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to fetch progress' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await authenticateRequest(request)
        if (!authResult.ok) {
            return authResult.response
        }

        const body = await request.json()
        const { courseId, enrollmentId, progressPercentage, completed } = body || {}

        const userId = authResult.context.userId
        let targetEnrollmentId: string | null = null
        let targetCourseId: number | null = null

        if (enrollmentId) {
            targetEnrollmentId = enrollmentId
            const enr = await db.query.courseEnrollments.findFirst({
                where: and(
                    eq(courseEnrollments.id, enrollmentId),
                    eq(courseEnrollments.userId, userId)
                ),
                columns: { id: true, courseId: true },
            })
            if (enr) {
                targetCourseId = enr.courseId
            }
        } else if (courseId) {
            targetCourseId = Number(courseId)
            const enr = await db.query.courseEnrollments.findFirst({
                where: and(
                    eq(courseEnrollments.userId, userId),
                    eq(courseEnrollments.courseId, targetCourseId)
                ),
                columns: { id: true, courseId: true },
            })
            if (enr) {
                targetEnrollmentId = enr.id
            }
        }

        if (!targetEnrollmentId || !targetCourseId) {
            return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
        }

        const pct = progressPercentage !== undefined ? Number(progressPercentage) : undefined
        const isDone = completed !== undefined ? Boolean(completed) : (pct !== undefined ? pct >= 100 : false)
        const now = new Date()

        const existing = await db.query.courseProgress.findFirst({
            where: eq(courseProgress.enrollmentId, targetEnrollmentId),
            columns: { id: true },
        })

        if (existing) {
            await db
                .update(courseProgress)
                .set({
                    ...(pct !== undefined ? { progressPercentage: pct } : {}),
                    completed: isDone,
                    completedAt: isDone ? now : null,
                    lastAccessed: now,
                    updatedAt: now,
                })
                .where(eq(courseProgress.enrollmentId, targetEnrollmentId))
        } else {
            await db.insert(courseProgress).values({
                enrollmentId: targetEnrollmentId,
                progressPercentage: pct ?? (isDone ? 100 : 0),
                completed: isDone,
                completedAt: isDone ? now : null,
                lastAccessed: now,
                updatedAt: now,
            })
        }

        // Keep program progress in sync
        if (isDone) {
            await markCourseCompleted(userId, targetCourseId)
        } else {
            await markCourseIncomplete(userId, targetCourseId)
        }

        return NextResponse.json({
            success: true,
            enrollmentId: targetEnrollmentId,
            progress: pct ?? (isDone ? 100 : 0),
            completed: isDone,
        })
    } catch (err: any) {
        console.error('Update progress error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to update progress' },
            { status: 500 }
        )
    }
}

