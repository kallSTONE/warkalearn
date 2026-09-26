import { supabase } from './supabase'

type CourseEnrollmentRow = {
    id: string
    course_id: number
}

type CourseProgressRow = {
    enrollment_id: string
    completed: boolean | null
}

const getRequiredCourseIds = async (programId: string): Promise<number[]> => {
    const { data, error } = await supabase
        .from('program_courses')
        .select('course_id')
        .eq('program_id', programId)
        .eq('is_required', true)

    if (error) {
        throw error
    }

    return (data ?? []).map((row) => row.course_id)
}

const ensureCourseEnrollment = async (
    userId: string,
    courseId: number
): Promise<string> => {
    const { data: existing, error: existingError } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle()

    if (existingError) {
        throw existingError
    }

    if (existing) {
        return existing.id
    }

    const { data: created, error: createError } = await supabase
        .from('course_enrollments')
        .insert({ user_id: userId, course_id: courseId, amount_paid: 0 })
        .select('id')
        .single()

    if (createError) {
        throw createError
    }

    return created.id
}

const setCourseProgress = async (
    enrollmentId: string,
    completed: boolean
): Promise<void> => {
    const now = new Date().toISOString()

    const { data: existing, error: existingError } = await supabase
        .from('course_progress')
        .select('id')
        .eq('enrollment_id', enrollmentId)
        .maybeSingle()

    if (existingError) {
        throw existingError
    }

    if (existing) {
        const { error: updateError } = await supabase
            .from('course_progress')
            .update({
                completed,
                completed_at: completed ? now : null,
                progress_percentage: completed ? 100 : 0,
                last_accessed: now,
                updated_at: now,
            })
            .eq('enrollment_id', enrollmentId)

        if (updateError) {
            throw updateError
        }

        return
    }

    const { error: insertError } = await supabase.from('course_progress').insert({
        enrollment_id: enrollmentId,
        completed,
        completed_at: completed ? now : null,
        progress_percentage: completed ? 100 : 0,
        last_accessed: now,
        updated_at: now,
    })

    if (insertError) {
        throw insertError
    }
}

export const calculateProgramProgress = async (
    userId: string,
    programId: string
): Promise<number> => {
    const requiredCourseIds = await getRequiredCourseIds(programId)
    const totalRequired = requiredCourseIds.length

    if (totalRequired === 0) {
        const { data: updated, error: updateError } = await supabase
            .from('program_enrollments')
            .update({
                progress_percentage: 0,
                status: 'active',
                completed_at: null,
            })
            .eq('program_id', programId)
            .eq('user_id', userId)
            .select('id')
            .maybeSingle()

        if (updateError) {
            throw updateError
        }

        if (!updated) {
            const { error: insertError } = await supabase.from('program_enrollments').insert({
                program_id: programId,
                user_id: userId,
                status: 'active',
                progress_percentage: 0,
            })

            if (insertError) {
                throw insertError
            }
        }

        return 0
    }

    const { data: enrollments, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select('id, course_id')
        .eq('user_id', userId)
        .in('course_id', requiredCourseIds)

    if (enrollmentsError) {
        throw enrollmentsError
    }

    const typedEnrollments = (enrollments ?? []) as CourseEnrollmentRow[]
    const enrollmentIdToCourseId = new Map(
        typedEnrollments.map((row) => [row.id, row.course_id])
    )

    let completedCount = 0

    if (typedEnrollments.length > 0) {
        const enrollmentIds = typedEnrollments.map((row) => row.id)

        const { data: progressRows, error: progressError } = await supabase
            .from('course_progress')
            .select('enrollment_id, completed')
            .in('enrollment_id', enrollmentIds)
            .eq('completed', true)

        if (progressError) {
            throw progressError
        }

        const typedProgress = (progressRows ?? []) as CourseProgressRow[]
        const completedCourseIds = new Set<number>()

        for (const row of typedProgress) {
            const courseId = enrollmentIdToCourseId.get(row.enrollment_id)
            if (courseId !== undefined) {
                completedCourseIds.add(courseId)
            }
        }

        completedCount = completedCourseIds.size
    }

    const progressPercentage = (completedCount / totalRequired) * 100
    const isCompleted = progressPercentage === 100
    const now = new Date().toISOString()

    const { data: updated, error: updateError } = await supabase
        .from('program_enrollments')
        .update({
            progress_percentage: progressPercentage,
            status: isCompleted ? 'completed' : 'active',
            completed_at: isCompleted ? now : null,
        })
        .eq('program_id', programId)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle()

    if (updateError) {
        throw updateError
    }

    if (!updated) {
        const { error: insertError } = await supabase.from('program_enrollments').insert({
            program_id: programId,
            user_id: userId,
            status: isCompleted ? 'completed' : 'active',
            progress_percentage: progressPercentage,
            completed_at: isCompleted ? now : null,
        })

        if (insertError) {
            throw insertError
        }
    }

    return progressPercentage
}

export const markCourseCompleted = async (
    userId: string,
    courseId: number
): Promise<void> => {
    const enrollmentId = await ensureCourseEnrollment(userId, courseId)
    await setCourseProgress(enrollmentId, true)

    const { data: programs, error: programsError } = await supabase
        .from('program_courses')
        .select('program_id')
        .eq('course_id', courseId)

    if (programsError) {
        throw programsError
    }

    const programIds = Array.from(new Set((programs ?? []).map((row) => row.program_id)))

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

    const { data: programs, error: programsError } = await supabase
        .from('program_courses')
        .select('program_id')
        .eq('course_id', courseId)

    if (programsError) {
        throw programsError
    }

    const programIds = Array.from(new Set((programs ?? []).map((row) => row.program_id)))

    for (const programId of programIds) {
        await calculateProgramProgress(userId, programId)
    }
}
