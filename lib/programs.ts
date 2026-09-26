import { supabase } from './supabase'
import type { Course, Program, ProgramCourse } from './types'

type ProgramCourseRow = {
    sort_order: number | null
    is_required: boolean | null
    courses: {
        id: number
        title: string
        slug: string
        description: string | null
        hero_image: string | null
        category: string | null
        level: string | null
        estimated_hours: number | null
        requirements: string | null
        skills: string | null
        students: number | null
        rating: number | null
        featured: boolean | null
    } | null
}

type ProgramWithCoursesRow = {
    id: string
    program_courses: ProgramCourseRow[] | null
}

const mapCourse = (course: ProgramCourseRow['courses']): Course => {
    return {
        id: course?.id ?? 0,
        title: course?.title ?? '',
        slug: course?.slug ?? '',
        description: course?.description ?? '',
        hero_image: course?.hero_image ?? '',
        category: course?.category ?? '',
        level: course?.level ?? '',
        estimated_hours: course?.estimated_hours ?? 0,
        requirements: course?.requirements ?? '',
        skills: course?.skills ?? '',
        students: course?.students ?? 0,
        rating: course?.rating ?? 0,
        featured: course?.featured ?? false,
        lessons: [],
        reviews: [],
    }
}

const mapProgramCourses = (rows: ProgramCourseRow[] | null | undefined): ProgramCourse[] => {
    if (!rows || rows.length === 0) {
        return []
    }

    return rows
        .filter((row) => row.courses)
        .map((row) => ({
            course: mapCourse(row.courses),
            sort_order: row.sort_order ?? 0,
            is_required: row.is_required ?? false,
        }))
}

export const getPublishedPrograms = async (): Promise<Program[]> => {
    const { data, error } = await supabase
        .from('programs')
        .select('id')
        .eq('status', 'published')
        .order('created_at', { ascending: false })

    if (error) {
        throw error
    }

    if (!data || data.length === 0) {
        return []
    }

    return data.map((program) => ({
        id: program.id,
        courses: [],
    }))
}

export const getProgramBySlug = async (slug: string): Promise<Program | null> => {
    const { data, error } = await supabase
        .from('programs')
        .select(
            'id, program_courses (sort_order, is_required, courses (id, title, slug, description, hero_image, category, level, estimated_hours, requirements, skills, students, rating, featured))'
        )
        .eq('slug', slug)
        .order('sort_order', { foreignTable: 'program_courses', ascending: true })
        .maybeSingle()

    if (error) {
        throw error
    }

    if (!data) {
        return null
    }

    const typedProgram = data as ProgramWithCoursesRow

    return {
        id: typedProgram.id,
        courses: mapProgramCourses(typedProgram.program_courses),
    }
}

export const enrollInProgram = async (programId: string, userId: string): Promise<void> => {
    const { data: existingEnrollment, error: enrollmentError } = await supabase
        .from('program_enrollments')
        .select('id')
        .eq('program_id', programId)
        .eq('user_id', userId)
        .maybeSingle()

    if (enrollmentError) {
        throw enrollmentError
    }

    if (!existingEnrollment) {
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

    const { data: requiredCourses, error: requiredError } = await supabase
        .from('program_courses')
        .select('course_id, is_required')
        .eq('program_id', programId)
        .eq('is_required', true)

    if (requiredError) {
        throw requiredError
    }

    const requiredCourseIds = (requiredCourses ?? []).map((row) => row.course_id)

    if (requiredCourseIds.length === 0) {
        return
    }

    const { data: existingCourseEnrollments, error: courseEnrollmentsError } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', userId)
        .in('course_id', requiredCourseIds)

    if (courseEnrollmentsError) {
        throw courseEnrollmentsError
    }

    const enrolledCourseIds = new Set(
        (existingCourseEnrollments ?? []).map((row) => row.course_id)
    )

    const missingCourseIds = requiredCourseIds.filter((courseId) => !enrolledCourseIds.has(courseId))

    if (missingCourseIds.length === 0) {
        return
    }

    const enrollmentsToInsert = missingCourseIds.map((courseId) => ({
        course_id: courseId,
        user_id: userId,
    }))

    const { error: upsertError } = await supabase
        .from('course_enrollments')
        .upsert(enrollmentsToInsert, { onConflict: 'user_id,course_id' })

    if (upsertError) {
        throw upsertError
    }
}
