import { NextResponse } from 'next/server'
import { db } from '@/db'
import { courseEnrollments, courseProgress, courses } from '@/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { authenticateRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const authResult = await authenticateRequest(request)
        if (!authResult.ok) {
            return authResult.response
        }

        const { searchParams } = new URL(request.url)
        const courseIdParam = searchParams.get('courseId')
        const slugParam = searchParams.get('slug')

        let targetCourseId: number | null = null

        if (courseIdParam) {
            targetCourseId = Number(courseIdParam)
        } else if (slugParam) {
            const course = await db.query.courses.findFirst({
                where: eq(courses.slug, slugParam),
                columns: { id: true },
            })
            if (course) {
                targetCourseId = course.id
            }
        }

        if (!targetCourseId || isNaN(targetCourseId)) {
            return NextResponse.json({ error: 'Valid courseId or slug is required' }, { status: 400 })
        }

        const enrollment = await db.query.courseEnrollments.findFirst({
            where: and(
                eq(courseEnrollments.userId, authResult.context.userId),
                eq(courseEnrollments.courseId, targetCourseId)
            ),
            columns: { id: true },
        })

        return NextResponse.json({
            isEnrolled: Boolean(enrollment),
            enrollmentId: enrollment?.id || null,
        })
    } catch (err: any) {
        console.error('Check enrollment error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to check enrollment' },
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
        const { courseId, slug, amountPaid } = body || {}

        let targetCourseId: number | null = null

        if (courseId) {
            targetCourseId = Number(courseId)
        } else if (slug) {
            const course = await db.query.courses.findFirst({
                where: eq(courses.slug, slug),
                columns: { id: true },
            })
            if (course) {
                targetCourseId = course.id
            }
        }

        if (!targetCourseId || isNaN(targetCourseId)) {
            return NextResponse.json({ error: 'Valid courseId or slug is required' }, { status: 400 })
        }

        const userId = authResult.context.userId

        // Check if already enrolled
        const existingEnrollment = await db.query.courseEnrollments.findFirst({
            where: and(
                eq(courseEnrollments.userId, userId),
                eq(courseEnrollments.courseId, targetCourseId)
            ),
            columns: { id: true },
        })

        if (existingEnrollment) {
            return NextResponse.json({
                success: true,
                status: 'already',
                enrollmentId: existingEnrollment.id,
            })
        }

        // Create enrollment & initialize progress in transaction
        const result = await db.transaction(async (tx) => {
            const [newEnrollment] = await tx
                .insert(courseEnrollments)
                .values({
                    userId,
                    courseId: targetCourseId!,
                })
                .returning({ id: courseEnrollments.id })

            await tx.insert(courseProgress).values({
                enrollmentId: newEnrollment.id,
                progressPercentage: 0,
                completed: false,
            })

            // Increment students count
            await tx
                .update(courses)
                .set({
                    students: sql`${courses.students} + 1`,
                })
                .where(eq(courses.id, targetCourseId!))

            return newEnrollment
        })

        return NextResponse.json({
            success: true,
            status: 'enrolled',
            enrollmentId: result.id,
        })
    } catch (err: any) {
        console.error('Enrollment error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to process enrollment' },
            { status: 500 }
        )
    }
}

