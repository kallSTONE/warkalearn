import { NextResponse } from 'next/server'
import { db } from '@/db'
import {
    courses,
    lessons,
    lessonQuizCompletions,
    certificationSettings,
    certificationQuestions,
    certificationAttempts,
    certificates,
} from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { authenticateRequest } from '@/lib/server/api-auth'
import {
    DEFAULT_CERTIFICATION_SETTINGS,
    normalizeCertificationSettings,
    isCertificationUnlocked,
} from '@/lib/certification'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: { slug: string } }
) {
    try {
        const authResult = await authenticateRequest(request)
        if (!authResult.ok) {
            return authResult.response
        }

        const userId = authResult.context.userId
        const { slug } = params

        const course = await db.query.courses.findFirst({
            where: eq(courses.slug, slug),
            with: {
                lessons: {
                    columns: { id: true, stepOrder: true },
                },
            },
        })

        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 })
        }

        const lessonIds = course.lessons.map((l) => l.id)

        // Check completed lessons
        const completions = lessonIds.length > 0
            ? await db.query.lessonQuizCompletions.findMany({
                where: and(
                    eq(lessonQuizCompletions.userId, userId),
                ),
            })
            : []

        const completedLessonIds = new Set(completions.map((c) => c.lessonId))
        const lessonSummaries = course.lessons.map((l) => ({
            id: String(l.id),
            completed: completedLessonIds.has(l.id),
            progress: completedLessonIds.has(l.id) ? 100 : 0,
        }))

        const unlocked = isCertificationUnlocked(lessonSummaries)

        // Fetch certification settings
        const settingsRow = await db.query.certificationSettings.findFirst({
            where: eq(certificationSettings.courseId, course.id),
        })

        const settings = normalizeCertificationSettings(
            settingsRow
                ? {
                    enabled: settingsRow.enabled,
                    passing_score: settingsRow.passingScore,
                    time_per_question_minutes: settingsRow.timePerQuestionMinutes,
                    retry_cooldown_hours: settingsRow.retryCooldownHours,
                    question_limit: settingsRow.questionLimit,
                    verification_base_url: settingsRow.verificationBaseUrl,
                    certificate_title: settingsRow.certificateTitle,
                    issuer_name: settingsRow.issuerName,
                    logo_path: settingsRow.logoPath,
                    template_variant: settingsRow.templateVariant,
                }
                : null
        )

        // Fetch active questions (without revealing correct_option to client if taking test, or sanitized)
        const questionsList = await db.query.certificationQuestions.findMany({
            where: and(
                eq(certificationQuestions.courseId, course.id),
                eq(certificationQuestions.active, true)
            ),
            orderBy: (cq, { asc }) => [asc(cq.sortOrder)],
        })

        const formattedQuestions = questionsList.map((q) => ({
            id: q.id,
            question: q.question,
            options: (q.options as string[]) || [],
            sort_order: q.sortOrder,
            active: q.active,
        }))

        // Fetch latest attempt
        const latestAttemptRow = await db.query.certificationAttempts.findFirst({
            where: and(
                eq(certificationAttempts.userId, userId),
                eq(certificationAttempts.courseId, course.id)
            ),
            orderBy: [desc(certificationAttempts.attemptNumber)],
        })

        const latestAttempt = latestAttemptRow
            ? {
                id: latestAttemptRow.id,
                score: latestAttemptRow.score,
                passed: latestAttemptRow.passed,
                started_at: latestAttemptRow.startedAt.toISOString(),
                submitted_at: latestAttemptRow.submittedAt?.toISOString() || null,
                next_retry_at: latestAttemptRow.nextRetryAt?.toISOString() || null,
                attempt_number: latestAttemptRow.attemptNumber,
            }
            : null

        // Fetch certificate if already earned
        const certificateRow = await db.query.certificates.findFirst({
            where: and(
                eq(certificates.userId, userId),
                eq(certificates.courseId, course.id),
                eq(certificates.status, 'active')
            ),
        })

        const certificate = certificateRow
            ? {
                id: certificateRow.id,
                certificate_code: certificateRow.certificateCode,
                verification_url: certificateRow.verificationUrl,
                pdf_url: certificateRow.pdfUrl,
                issued_at: certificateRow.issuedAt.toISOString(),
                pass_score: certificateRow.passScore,
            }
            : null

        return NextResponse.json({
            course: {
                id: course.id,
                title: course.title,
                slug: course.slug,
            },
            unlocked,
            settings,
            questions: formattedQuestions,
            latestAttempt,
            certificate,
        })
    } catch (err: any) {
        console.error('Certification info error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to fetch certification info' },
            { status: 500 }
        )
    }
}

