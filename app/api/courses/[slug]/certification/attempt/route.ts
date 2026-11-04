import { NextResponse } from 'next/server'
import { db } from '@/db'
import {
    courses,
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
    buildVerificationUrl,
} from '@/lib/certification'

export const dynamic = 'force-dynamic'

export async function POST(
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
            columns: { id: true, title: true },
        })

        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 })
        }

        const body = await request.json()
        const userAnswers: Record<string, number> = body.answers || {} // { [questionId]: selectedOptionIndex }
        const startedAt = body.startedAt ? new Date(body.startedAt) : new Date()

        // 1. Fetch settings
        const settingsRow = await db.query.certificationSettings.findFirst({
            where: eq(certificationSettings.courseId, course.id),
        })
        const settings = normalizeCertificationSettings(
            settingsRow
                ? {
                    enabled: settingsRow.enabled,
                    passing_score: settingsRow.passingScore,
                    retry_cooldown_hours: settingsRow.retryCooldownHours,
                    verification_base_url: settingsRow.verificationBaseUrl,
                }
                : null
        )

        // 2. Fetch all active questions with correct answers
        const questionsList = await db.query.certificationQuestions.findMany({
            where: and(
                eq(certificationQuestions.courseId, course.id),
                eq(certificationQuestions.active, true)
            ),
            orderBy: (cq, { asc }) => [asc(cq.sortOrder)],
        })

        if (questionsList.length === 0) {
            return NextResponse.json({ error: 'No exam questions found for this course.' }, { status: 400 })
        }

        // 3. Grade the attempt
        let correctCount = 0
        for (const q of questionsList) {
            if (userAnswers[q.id] === q.correctOption) {
                correctCount++
            }
        }

        const score = Math.round((correctCount / questionsList.length) * 100)
        const passed = score >= settings.passing_score
        const submittedAt = new Date()

        // Calculate next retry time if failed
        const nextRetryAt = passed
            ? null
            : new Date(Date.now() + settings.retry_cooldown_hours * 60 * 60 * 1000)

        // Find last attempt number
        const lastAttempt = await db.query.certificationAttempts.findFirst({
            where: and(
                eq(certificationAttempts.userId, userId),
                eq(certificationAttempts.courseId, course.id)
            ),
            orderBy: [desc(certificationAttempts.attemptNumber)],
            columns: { attemptNumber: true },
        })

        const attemptNumber = (lastAttempt?.attemptNumber ?? 0) + 1

        const result = await db.transaction(async (tx) => {
            // Record attempt
            const [attempt] = await tx
                .insert(certificationAttempts)
                .values({
                    userId,
                    courseId: course.id,
                    attemptNumber,
                    startedAt,
                    submittedAt,
                    durationSeconds: Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000),
                    score,
                    passed,
                    answers: userAnswers,
                    questionSnapshot: questionsList.map((q) => ({ id: q.id, question: q.question })),
                    nextRetryAt,
                })
                .returning()

            let certResult: any = null

            // If passed, issue or update certificate
            if (passed) {
                const uniqueCode = `CERT-${course.id}-${userId.slice(0, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
                const verificationUrl = buildVerificationUrl(settings.verification_base_url, uniqueCode)

                const existingCert = await tx.query.certificates.findFirst({
                    where: and(
                        eq(certificates.userId, userId),
                        eq(certificates.courseId, course.id)
                    ),
                })

                if (existingCert) {
                    const [updated] = await tx
                        .update(certificates)
                        .set({
                            attemptId: attempt.id,
                            passScore: score,
                            status: 'active',
                            updatedAt: new Date(),
                        })
                        .where(eq(certificates.id, existingCert.id))
                        .returning()
                    certResult = updated
                } else {
                    const [created] = await tx
                        .insert(certificates)
                        .values({
                            userId,
                            courseId: course.id,
                            attemptId: attempt.id,
                            certificateCode: uniqueCode,
                            verificationUrl,
                            status: 'active',
                            passScore: score,
                            issuedAt: new Date(),
                        })
                        .returning()
                    certResult = created
                }
            }

            return { attempt, certResult }
        })

        return NextResponse.json({
            success: true,
            score,
            passed,
            attempt: result.attempt,
            certificate: result.certResult,
        })
    } catch (err: any) {
        console.error('Submit certification attempt error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to submit exam attempt.' },
            { status: 500 }
        )
    }
}

