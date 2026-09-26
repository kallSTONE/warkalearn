import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
    try {
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

        // Load course title from DB to ensure exact match
        const { data: course, error: fetchError } = await supabase
            .from('courses')
            .select('id, title')
            .eq('id', courseId)
            .single()

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 })
        }

        if (!course) {
            return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 })
        }

        // Exact match check (case-sensitive, trimmed on both sides)
        const dbTitle = (course.title ?? '').trim()
        const entered = (enteredCourseName ?? '').trim()
        if (dbTitle !== entered) {
            return NextResponse.json({ ok: false, reason: 'name-mismatch' }, { status: 400 })
        }

        // Perform delete; rely on DB constraints for cascading
        const { error: deleteError } = await supabase
            .from('courses')
            .delete()
            .eq('id', courseId)

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
    }
}
