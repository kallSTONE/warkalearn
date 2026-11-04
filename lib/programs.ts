import { db } from '@/db'
import {
    programs,
    programCourses,
    programEnrollments,
    courseEnrollments,
    courses,
} from '@/db/schema'
import { eq, desc, asc, and, inArray } from 'drizzle-orm'
import type { Course, Program, ProgramCourse } from './types'

const mapCourse = (course: any): Course => {
    return {
        id: course?.id ?? 0,
        title: course?.title ?? '',
        slug: course?.slug ?? '',
        description: course?.description ?? '',
        hero_image: course?.heroImage ?? course?.hero_image ?? '',
        category: course?.category ?? '',
        level: course?.level ?? '',
        estimated_hours: course?.estimatedHours ?? course?.estimated_hours ?? 0,
        requirements: course?.requirements ?? '',
        skills: course?.skills ?? '',
        students: course?.students ?? 0,
        rating: Number(course?.rating ?? 0),
        featured: course?.featured ?? false,
        lessons: [],
        reviews: [],
    }
}

export const getPublishedPrograms = async (): Promise<Program[]> => {
    try {
        const rows = await db.query.programs.findMany({
            where: eq(programs.status, 'published'),
            orderBy: [desc(programs.createdAt)],
            columns: {
                id: true,
            },
        })

        return rows.map((program) => ({
            id: program.id,
            courses: [],
        }))
    } catch (error) {
        console.error('getPublishedPrograms error:', error)
        throw error
    }
}

export const getProgramBySlug = async (slug: string): Promise<Program | null> => {
    try {
        const program = await db.query.programs.findFirst({
            where: eq(programs.slug, slug),
            with: {
                programCourses: {
                    orderBy: (pc, { asc }) => [asc(pc.sortOrder)],
                    with: {
                        course: true,
                    },
                },
            },
        })

        if (!program) {
            return null
        }

        const mappedCourses: ProgramCourse[] = (program.programCourses || [])
            .filter((pc) => pc.course)
            .map((pc) => ({
                course: mapCourse(pc.course),
                sort_order: pc.sortOrder ?? 0,
                is_required: pc.isRequired ?? false,
            }))

        return {
            id: program.id,
            courses: mappedCourses,
        }
    } catch (error) {
        console.error('getProgramBySlug error:', error)
        throw error
    }
}

export const enrollInProgram = async (programId: string, userId: string): Promise<void> => {
    try {
        await db.transaction(async (tx) => {
            // 1. Ensure program enrollment exists
            const existingEnrollment = await tx.query.programEnrollments.findFirst({
                where: and(
                    eq(programEnrollments.programId, programId),
                    eq(programEnrollments.userId, userId)
                ),
            })

            if (!existingEnrollment) {
                await tx.insert(programEnrollments).values({
                    programId,
                    userId,
                    status: 'active',
                    progressPercentage: '0',
                })
            }

            // 2. Fetch required courses in this program
            const requiredCourses = await tx.query.programCourses.findMany({
                where: and(
                    eq(programCourses.programId, programId),
                    eq(programCourses.isRequired, true)
                ),
                columns: {
                    courseId: true,
                },
            })

            const requiredCourseIds = requiredCourses.map((rc) => rc.courseId)
            if (requiredCourseIds.length === 0) {
                return
            }

            // 3. Find existing course enrollments
            const existingCourseEnrollments = await tx.query.courseEnrollments.findMany({
                where: and(
                    eq(courseEnrollments.userId, userId),
                    inArray(courseEnrollments.courseId, requiredCourseIds)
                ),
                columns: {
                    courseId: true,
                },
            })

            const enrolledCourseIds = new Set(
                existingCourseEnrollments.map((row) => row.courseId)
            )

            const missingCourseIds = requiredCourseIds.filter(
                (courseId) => !enrolledCourseIds.has(courseId)
            )

            // 4. Enroll in missing required courses
            for (const courseId of missingCourseIds) {
                await tx
                    .insert(courseEnrollments)
                    .values({
                        courseId,
                        userId,
                    })
                    .onConflictDoNothing()
            }
        })
    } catch (error) {
        console.error('enrollInProgram error:', error)
        throw error
    }
}
