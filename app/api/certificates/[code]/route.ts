import { NextResponse } from 'next/server'
import { db } from '@/db'
import { certificates, profiles, courses, users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: { code: string } }
) {
    try {
        const certificateCode = decodeURIComponent(params.code || '').trim()
        if (!certificateCode) {
            return NextResponse.json({ error: 'Certificate code is required' }, { status: 400 })
        }

        const cert = await db.query.certificates.findFirst({
            where: eq(certificates.certificateCode, certificateCode),
        })

        if (!cert) {
            return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
        }

        const [profile, course, user] = await Promise.all([
            db.query.profiles.findFirst({
                where: eq(profiles.id, cert.userId),
                columns: { fullName: true },
            }),
            db.query.courses.findFirst({
                where: eq(courses.id, cert.courseId),
                columns: { title: true },
            }),
            db.query.users.findFirst({
                where: eq(users.id, cert.userId),
                columns: { name: true },
            }),
        ])

        const studentName = profile?.fullName?.trim() || user?.name?.trim() || 'Verified Learner'
        const courseTitle = course?.title?.trim() || 'Course'

        return NextResponse.json({
            certificate: {
                id: cert.id,
                user_id: cert.userId,
                course_id: cert.courseId,
                certificate_code: cert.certificateCode,
                verification_url: cert.verificationUrl,
                status: cert.status,
                issued_at: cert.issuedAt.toISOString(),
                pdf_url: cert.pdfUrl,
            },
            studentName,
            courseTitle,
        })
    } catch (err: any) {
        console.error('Fetch certificate verification error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to verify certificate' },
            { status: 500 }
        )
    }
}

