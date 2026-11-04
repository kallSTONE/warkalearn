import { NextResponse } from 'next/server'
import { db } from '@/db'
import { courses } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdminRequest } from '@/lib/server/api-auth'

export async function POST(req: Request) {
    try {
        const authResult = await requireAdminRequest(req)
        if (!authResult.ok) {
            return authResult.response
        }

        const body = await req.json()
        const { courseId, enteredCourseName, password } = body || {}

        if (!courseId || !enteredCourseName || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const secret = process.env.ADMIN_DELETE_COURSE_PASSWORD
        if (!secret) {
            return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
        }

        if (password !== secret) {
            return NextResponse.json({ ok: false, reason: 'invalid-password' }, { status: 401 })
        }

        const numericCourseId = Number(courseId)
        if (isNaN(numericCourseId)) {
            return NextResponse.json({ ok: false, reason: 'invalid-id' }, { status: 400 })
        }

        // Load course title from DB to ensure exact match
        const course = await db.query.courses.findFirst({
            where: eq(courses.id, numericCourseId),
            columns: {
                id: true,
                title: true,
            },
        })

        if (!course) {
            return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 })
        }

        // Exact match check (case-sensitive, trimmed on both sides)
        const dbTitle = (course.title ?? '').trim()
        const entered = (enteredCourseName ?? '').trim()
        if (dbTitle !== entered) {
            return NextResponse.json({ ok: false, reason: 'name-mismatch' }, { status: 400 })
        }

        // Perform delete; foreign key constraints cascade to lessons, enrollments, media
        await db.delete(courses).where(eq(courses.id, numericCourseId))

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('Course deletion error:', err)
        return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
    }
}
