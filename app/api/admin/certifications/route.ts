import { NextResponse } from 'next/server'
import { db } from '@/db'
import {
    courses,
    certificationSettings,
    certificationQuestions,
} from '@/db/schema'
import { and, asc, desc, eq } from 'drizzle-orm'
import { requireAdminRequest } from '@/lib/server/api-auth'
import { DEFAULT_CERTIFICATION_SETTINGS, normalizeCertificationSettings } from '@/lib/certification'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const authResult = await requireAdminRequest(request)
        if (!authResult.ok) {
            return authResult.response
        }

        const { searchParams } = new URL(request.url)
        const courseIdParam = searchParams.get('courseId')

        if (courseIdParam) {
            const courseId = Number(courseIdParam)

            const [settingsRow, questionsRows] = await Promise.all([
                db.query.certificationSettings.findFirst({
                    where: eq(certificationSettings.courseId, courseId),
                }),
                db.query.certificationQuestions.findMany({
                    where: eq(certificationQuestions.courseId, courseId),
                    orderBy: (cq, { asc }) => [asc(cq.sortOrder)],
                }),
            ])

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

            const questions = questionsRows.map((q) => ({
                id: q.id,
                question: q.question,
                options: (q.options as string[]) || [],
                correct_option: q.correctOption,
                explanation: q.explanation,
                sort_order: q.sortOrder,
                active: q.active,
            }))

            return NextResponse.json({ settings, questions })
        }

        // Return all courses with their certification settings
        const allCourses = await db.query.courses.findMany({
            orderBy: [desc(courses.createdAt)],
            columns: {
                id: true,
                title: true,
                slug: true,
            },
        })

        const allSettings = await db.query.certificationSettings.findMany()
        const settingsMap = new Map(allSettings.map((s) => [s.courseId, s]))

        const result = allCourses.map((c) => ({
            ...c,
            certificationEnabled: settingsMap.get(c.id)?.enabled ?? false,
        }))

        return NextResponse.json(result)
    } catch (err: any) {
        console.error('Admin certifications GET error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to fetch certification settings' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await requireAdminRequest(request)
        if (!authResult.ok) {
            return authResult.response
        }

        const body = await request.json()
        const { courseId, settings: s, questions } = body || {}

        const numericCourseId = Number(courseId)
        if (!numericCourseId || isNaN(numericCourseId)) {
            return NextResponse.json({ error: 'Valid courseId is required' }, { status: 400 })
        }

        await db.transaction(async (tx) => {
            // 1. Upsert certification settings
            const existingSetting = await tx.query.certificationSettings.findFirst({
                where: eq(certificationSettings.courseId, numericCourseId),
            })

            const values = {
                courseId: numericCourseId,
                enabled: Boolean(s?.enabled),
                passingScore: Number(s?.passing_score ?? s?.passingScore ?? 70),
                timePerQuestionMinutes: Number(s?.time_per_question_minutes ?? s?.timePerQuestionMinutes ?? 2),
                retryCooldownHours: Number(s?.retry_cooldown_hours ?? s?.retryCooldownHours ?? 48),
                questionLimit: s?.question_limit ? Number(s.question_limit) : null,
                verificationBaseUrl: s?.verification_base_url || 'https://earn-neway.vercel.app/certverify',
                certificateTitle: s?.certificate_title || 'Course Certification',
                issuerName: s?.issuer_name || 'Neway',
                logoPath: s?.logo_path || '/assets/images/warkalogo.png',
                templateVariant: s?.template_variant || 'premium-minimal',
                updatedAt: new Date(),
            }

            if (existingSetting) {
                await tx
                    .update(certificationSettings)
                    .set(values)
                    .where(eq(certificationSettings.id, existingSetting.id))
            } else {
                await tx.insert(certificationSettings).values(values)
            }

            // 2. Replace questions if array provided
            if (Array.isArray(questions)) {
                await tx
                    .delete(certificationQuestions)
                    .where(eq(certificationQuestions.courseId, numericCourseId))

                for (let idx = 0; idx < questions.length; idx++) {
                    const q = questions[idx]
                    await tx.insert(certificationQuestions).values({
                        courseId: numericCourseId,
                        question: q.question || '',
                        options: Array.isArray(q.options) ? q.options : [],
                        correctOption: Number(q.correct_option ?? q.correctOption ?? 0),
                        explanation: q.explanation || null,
                        sortOrder: idx + 1,
                        active: q.active !== undefined ? Boolean(q.active) : true,
                    })
                }
            }
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Admin certifications POST error:', err)
        return NextResponse.json(
            { error: err?.message || 'Failed to save certification settings' },
            { status: 500 }
        )
    }
}

