import { db } from '@/db'
import {
    programCourses,
    programEnrollments,
    courseEnrollments,
    courseProgress,
} from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

const getRequiredCourseIds = async (programId: string): Promise<number[]> => {
    const rows = await db.query.programCourses.findMany({
        where: and(
            eq(programCourses.programId, programId),
            eq(programCourses.isRequired, true)
        ),
        columns: {
            courseId: true,
        },
    })

    return rows.map((r) => r.courseId)
}

const ensureCourseEnrollment = async (
    userId: string,
    courseId: number
): Promise<string> => {
    const existing = await db.query.courseEnrollments.findFirst({
        where: and(
            eq(courseEnrollments.userId, userId),
            eq(courseEnrollments.courseId, courseId)
        ),
        columns: {
            id: true,
        },
    })

    if (existing) {
        return existing.id
    }

    const [created] = await db
        .insert(courseEnrollments)
        .values({
            userId,
            courseId,
        })
        .returning({ id: courseEnrollments.id })

    return created.id
}

const setCourseProgress = async (
    enrollmentId: string,
    completed: boolean
): Promise<void> => {
    const now = new Date()

    const existing = await db.query.courseProgress.findFirst({
        where: eq(courseProgress.enrollmentId, enrollmentId),
        columns: { id: true },
    })

    if (existing) {
        await db
            .update(courseProgress)
            .set({
                completed,
                completedAt: completed ? now : null,
                progressPercentage: completed ? 100 : 0,
                lastAccessed: now,
                updatedAt: now,
            })
            .where(eq(courseProgress.enrollmentId, enrollmentId))
        return
    }

    await db.insert(courseProgress).values({
        enrollmentId,
        completed,
        completedAt: completed ? now : null,
        progressPercentage: completed ? 100 : 0,
        lastAccessed: now,
        updatedAt: now,
    })
}

export const calculateProgramProgress = async (
    userId: string,
    programId: string
): Promise<number> => {
    const requiredCourseIds = await getRequiredCourseIds(programId)
    const totalRequired = requiredCourseIds.length

    if (totalRequired === 0) {
        const existing = await db.query.programEnrollments.findFirst({
            where: and(
                eq(programEnrollments.programId, programId),
                eq(programEnrollments.userId, userId)
            ),
        })

        if (existing) {
            await db
                .update(programEnrollments)
                .set({
                    progressPercentage: '0',
                    status: 'active',
                    completedAt: null,
                })
                .where(
                    and(
                        eq(programEnrollments.programId, programId),
                        eq(programEnrollments.userId, userId)
                    )
                )
        } else {
            await db.insert(programEnrollments).values({
                programId,
                userId,
                status: 'active',
                progressPercentage: '0',
            })
        }

        return 0
    }

    const enrollments = await db.query.courseEnrollments.findMany({
        where: and(
            eq(courseEnrollments.userId, userId),
            inArray(courseEnrollments.courseId, requiredCourseIds)
        ),
        columns: {
            id: true,
            courseId: true,
        },
    })

    const enrollmentIdToCourseId = new Map(
        enrollments.map((row) => [row.id, row.courseId])
    )

    let completedCount = 0

    if (enrollments.length > 0) {
        const enrollmentIds = enrollments.map((row) => row.id)

        const progressRows = await db.query.courseProgress.findMany({
            where: and(
                inArray(courseProgress.enrollmentId, enrollmentIds),
                eq(courseProgress.completed, true)
            ),
            columns: {
                enrollmentId: true,
                completed: true,
            },
        })

        const completedCourseIds = new Set<number>()

        for (const row of progressRows) {
            const courseId = enrollmentIdToCourseId.get(row.enrollmentId)
            if (courseId !== undefined) {
                completedCourseIds.add(courseId)
            }
        }

        completedCount = completedCourseIds.size
    }

    const progressPercentage = Math.round((completedCount / totalRequired) * 100)
    const isCompleted = progressPercentage === 100
    const now = new Date()

    const existing = await db.query.programEnrollments.findFirst({
        where: and(
            eq(programEnrollments.programId, programId),
            eq(programEnrollments.userId, userId)
        ),
    })

    if (existing) {
        await db
            .update(programEnrollments)
            .set({
                progressPercentage: String(progressPercentage),
                status: isCompleted ? 'completed' : 'active',
                completedAt: isCompleted ? now : null,
            })
            .where(
                and(
                    eq(programEnrollments.programId, programId),
                    eq(programEnrollments.userId, userId)
                )
            )
    } else {
        await db.insert(programEnrollments).values({
            programId,
            userId,
            status: isCompleted ? 'completed' : 'active',
            progressPercentage: String(progressPercentage),
            completedAt: isCompleted ? now : null,
        })
    }

    return progressPercentage
}

export const markCourseCompleted = async (
    userId: string,
    courseId: number
): Promise<void> => {
    const enrollmentId = await ensureCourseEnrollment(userId, courseId)
    await setCourseProgress(enrollmentId, true)

    const programsList = await db.query.programCourses.findMany({
        where: eq(programCourses.courseId, courseId),
        columns: {
            programId: true,
        },
    })

    const programIds = Array.from(new Set(programsList.map((row) => row.programId)))

    for (const programId of programIds) {
        await calculateProgramProgress(userId, programId)
    }
}

export const markCourseIncomplete = async (
    userId: string,
    courseId: number
): Promise<void> => {
    const enrollmentId = await ensureCourseEnrollment(userId, courseId)
    await setCourseProgress(enrollmentId, false)

    const programsList = await db.query.programCourses.findMany({
        where: eq(programCourses.courseId, courseId),
        columns: {
            programId: true,
        },
    })

    const programIds = Array.from(new Set(programsList.map((row) => row.programId)))

    for (const programId of programIds) {
        await calculateProgramProgress(userId, programId)
    }
}
