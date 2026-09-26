"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { BadgeCheck, Clock3, Download, Lock, RefreshCcw, ShieldCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useSupabase } from "@/components/providers/supabase-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { translate } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  DEFAULT_CERTIFICATION_SETTINGS,
  CertificationQuestion,
  CertificationSettings,
  buildVerificationUrl,
  getCertificationDurationSeconds,
  getCertificationQuestionSet,
  isCertificationUnlocked,
  normalizeCertificationSettings,
} from "@/lib/certification"

type Course = {
  id: number
  title: string
  slug: string
  lessons: Array<{ id: string; title: string; step_order: number; completed: boolean; progress: number }>
}

type AttemptRow = {
  id: string
  score: number
  passed: boolean
  started_at: string
  submitted_at: string | null
  next_retry_at: string | null
  attempt_number: number
}

type CertificateRow = {
  id: string
  certificate_code: string
  verification_url: string
  status: string
  issued_at: string
  pdf_url: string | null
}

export default function CourseCertificationPage() {
  const params = useParams() as { slug: string }
  const router = useRouter()
  const { user } = useSupabase()
  const { locale } = useLanguage()
  const t = (key: string, fallback?: string) => translate(locale, key, fallback)
  const slug = params.slug

  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<Course | null>(null)
  const [settings, setSettings] = useState<CertificationSettings>(DEFAULT_CERTIFICATION_SETTINGS)
  const [questions, setQuestions] = useState<CertificationQuestion[]>([])
  const [attempt, setAttempt] = useState<AttemptRow | null>(null)
  const [certificate, setCertificate] = useState<CertificateRow | null>(null)
  const [examStarted, setExamStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ passed: boolean; score: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user === undefined) return
    if (!user) router.push("/login")
  }, [user, router])

  useEffect(() => {
    const load = async () => {
      if (!user || !slug) return

      setLoading(true)
      setError(null)

      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, title, slug, lessons(id, title, step_order)")
        .eq("slug", slug)
        .single()

      if (courseError || !courseData) {
        setError(courseError?.message || t('cert.notFound', 'Course not found'))
        setLoading(false)
        return
      }

      const sortedLessons = (courseData.lessons || [])
        .slice()
        .sort((a: any, b: any) => a.step_order - b.step_order)
        .map((lesson: any) => ({
          id: String(lesson.id),
          title: lesson.title,
          step_order: lesson.step_order,
        }))

      const lessonIds = (courseData.lessons || []).map((lesson: any) => Number(lesson.id))
      const { data: completionData, error: completionError } = await supabase
        .from("lesson_quiz_completions")
        .select("lesson_id")
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds)

      if (completionError) {
        setError(completionError.message)
        setLoading(false)
        return
      }

      const completedIds = new Set<number>((completionData || []).map((row: any) => row.lesson_id))
      const normalizedLessons = sortedLessons.map((lesson: any) => ({
        ...lesson,
        completed: completedIds.has(Number(lesson.id)),
        progress: completedIds.has(Number(lesson.id)) ? 100 : 0,
      }))

      setCourse({
        id: Number(courseData.id),
        title: courseData.title,
        slug: courseData.slug,
        lessons: normalizedLessons,
      })

      const certificationSettingsPromise = supabase
        .from("certification_settings")
        .select("enabled, passing_score, time_per_question_minutes, retry_cooldown_hours, question_limit, verification_base_url, certificate_title, issuer_name, logo_path, template_variant")
        .eq("course_id", Number(courseData.id))
        .maybeSingle()

      const certificationQuestionsPromise = supabase
        .from("certification_questions")
        .select("id, question, options, correct_option, explanation, sort_order, active")
        .eq("course_id", Number(courseData.id))
        .order("sort_order", { ascending: true })

      const latestAttemptPromise = supabase
        .from("certification_attempts")
        .select("id, score, passed, started_at, submitted_at, next_retry_at, attempt_number")
        .eq("course_id", Number(courseData.id))
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .maybeSingle()

      const certificatePromise = supabase
        .from("certificates")
        .select("id, certificate_code, verification_url, status, issued_at, pdf_url")
        .eq("course_id", Number(courseData.id))
        .eq("user_id", user.id)
        .maybeSingle()

      const [{ data: settingsData }, { data: questionsData }, { data: attemptData }, { data: certificateData }] =
        await Promise.all([certificationSettingsPromise, certificationQuestionsPromise, latestAttemptPromise, certificatePromise])

      const settingsNormalized = normalizeCertificationSettings(settingsData as Partial<CertificationSettings> | null)
      setSettings(settingsNormalized)

      setQuestions(
        getCertificationQuestionSet(
          (questionsData || []).map((question: any) => ({
            id: String(question.id),
            question: question.question ?? "",
            options: Array.isArray(question.options) ? question.options : [],
            correct_option: Number(question.correct_option ?? 0),
            explanation: question.explanation ?? null,
            sort_order: Number(question.sort_order ?? 0),
            active: question.active ?? true,
          })),
          settingsNormalized.question_limit
        )
      )

      setAttempt((attemptData as AttemptRow | null) ?? null)
      setCertificate((certificateData as CertificateRow | null) ?? null)
      setLoading(false)
    }

    load()
  }, [slug, user])

  const unlocked = useMemo(() => (course ? isCertificationUnlocked(course.lessons) : false), [course])
  const activeAttemptBlocked = useMemo(() => {
    if (!attempt?.next_retry_at) return false
    const retryAt = new Date(attempt.next_retry_at).getTime()
    return Number.isFinite(retryAt) && retryAt > Date.now() && !result?.passed
  }, [attempt, result])

  const retryLabel = useMemo(() => {
    if (!attempt?.next_retry_at) return null
    const retryAt = new Date(attempt.next_retry_at)
    if (Number.isNaN(retryAt.getTime())) return null
    return retryAt.toLocaleString(locale)
  }, [attempt, locale])

  const totalQuestions = questions.length
  const maxSeconds = useMemo(
    () => getCertificationDurationSeconds(totalQuestions, settings.time_per_question_minutes),
    [settings.time_per_question_minutes, totalQuestions]
  )

  useEffect(() => {
    if (!examStarted || timeLeft <= 0) return
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [examStarted, timeLeft])

  useEffect(() => {
    if (examStarted && timeLeft === 0 && !submitting && !result) {
      void submitExam(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, examStarted])

  const startExam = () => {
    setSelectedAnswers({})
    setResult(null)
    setExamStarted(true)
    setTimeLeft(maxSeconds)
  }

  const updateAnswer = (questionIndex: number, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }))
  }

  async function submitExam(autoSubmit = false) {
    if (!course || !user || submitting) return
    if (!autoSubmit && !examStarted) return
    if (!questions.length) return

    setSubmitting(true)
    try {
      const answered = questions.map((question, index) => selectedAnswers[index] ?? -1)
      const correctCount = questions.reduce((count, question, index) => {
        return count + (answered[index] === question.correct_option ? 1 : 0)
      }, 0)

      const score = Math.round((correctCount / questions.length) * 100)
      const passed = score >= settings.passing_score

      const { data: latestAttemptData } = await supabase
        .from("certification_attempts")
        .select("attempt_number")
        .eq("course_id", course.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .maybeSingle()

      const attemptNumber = Number(latestAttemptData?.attempt_number ?? 0) + 1
      const nextRetryAt = passed
        ? null
        : new Date(Date.now() + settings.retry_cooldown_hours * 60 * 60 * 1000).toISOString()

      const { error: attemptError } = await supabase.from("certification_attempts").insert({
        user_id: user.id,
        course_id: course.id,
        attempt_number: attemptNumber,
        started_at: new Date(Date.now() - Math.max(0, maxSeconds - timeLeft) * 1000).toISOString(),
        submitted_at: new Date().toISOString(),
        duration_seconds: maxSeconds,
        score,
        passed,
        answers: answered,
        question_snapshot: questions,
        next_retry_at: nextRetryAt,
      })

      if (attemptError) throw attemptError

      if (passed) {
        const existingCertificate = certificate

        const certificateCode =
          existingCertificate?.certificate_code ||
          `NEWAY-${crypto.randomUUID().replace(/-/g, "").slice(0, 14).toUpperCase()}`

        const verificationUrl = buildVerificationUrl(settings.verification_base_url, certificateCode)

        const { error: certificateError } = await supabase.from("certificates").upsert(
          {
            user_id: user.id,
            course_id: course.id,
            certificate_code: certificateCode,
            verification_url: verificationUrl,
            status: "active",
            pass_score: settings.passing_score,
          },
          { onConflict: "user_id,course_id" }
        )

        if (certificateError) throw certificateError

        setCertificate({
          id: existingCertificate?.id || certificateCode,
          certificate_code: certificateCode,
          verification_url: verificationUrl,
          status: "active",
          issued_at: new Date().toISOString(),
          pdf_url: existingCertificate?.pdf_url ?? null,
        })
      }

      setAttempt({
        id: crypto.randomUUID(),
        score,
        passed,
        started_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        next_retry_at: nextRetryAt,
        attempt_number: attemptNumber,
      })
      setResult({ passed, score })
      setExamStarted(false)
    } catch (submitError: any) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const downloadUrl = certificate ? `/api/certificates/${encodeURIComponent(certificate.certificate_code)}/pdf` : null

  if (loading) {
    return <div className="p-6 text-center">{t('cert.loading', 'Loading certification...')}</div>
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('cert.unavailable.title', 'Certification unavailable')}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!course) {
    return null
  }

  if (!settings.enabled) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('cert.disabled.title', 'Certification not enabled')}</CardTitle>
            <CardDescription>{t('cert.disabled.subtitle', 'This course does not have certification turned on yet.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push(`/learn/course/${course.slug}/lesson/1`)}>
              {t('cert.backToLessons', 'Back to lessons')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('cert.exam', 'Certification exam')}
        </div>
        <h1 className="text-2xl font-semibold md:text-3xl">{course.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t('cert.header.subtitle', 'Complete every lesson to unlock the exam. When you pass, you can download a branded PDF certificate instantly.')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('cert.progress.title', 'Course progress')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((course.lessons.filter((lesson) => lesson.completed).length / course.lessons.length) * 100)}%</div>
            <Progress className="mt-3 h-2" value={(course.lessons.filter((lesson) => lesson.completed).length / course.lessons.length) * 100} />
            <p className="mt-2 text-xs text-muted-foreground">{course.lessons.filter((lesson) => lesson.completed).length} {t('common.of', 'of')} {course.lessons.length} {t('cert.progress.lessonsComplete', 'lessons complete')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('cert.timer.title', 'Timer')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-2xl font-bold">
              <Clock3 className="h-5 w-5 text-primary" />
              {Math.floor((examStarted ? timeLeft : maxSeconds) / 60)}:{String((examStarted ? timeLeft : maxSeconds) % 60).padStart(2, "0")}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{settings.time_per_question_minutes} {t('cert.timer.perQuestion', 'minutes per question')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('cert.passing.title', 'Passing score')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settings.passing_score}%</div>
            <p className="mt-2 text-xs text-muted-foreground">{t('cert.retryCooldown', 'Retry cooldown')}: {settings.retry_cooldown_hours} {t('payment.hours', 'hours')}</p>
          </CardContent>
        </Card>
      </div>

      {!unlocked ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> {t('cert.locked', 'Locked')}</CardTitle>
            <CardDescription>{t('cert.locked.subtitle', 'Finish all lessons to unlock the certification exam.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push(`/learn/course/${course.slug}/lesson/1`)}>
              {t('cert.goToLessons', 'Go to lessons')}
            </Button>
          </CardContent>
        </Card>
      ) : certificate ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-emerald-600" /> {t('cert.issued.title', 'Certificate issued')}</CardTitle>
            <CardDescription>
              {t('cert.issued.subtitle', 'Your certificate is ready. Download the PDF or open the verification page.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('cert.code', 'Certificate code')}</p>
                <p className="font-medium">{certificate.certificate_code}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('cert.verification', 'Verification')}</p>
                <a href={certificate.verification_url} className="break-all text-primary underline underline-offset-4" target="_blank" rel="noreferrer">
                  {certificate.verification_url}
                </a>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {downloadUrl && (
                <Button asChild>
                  <a href={downloadUrl} target="_blank" rel="noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    {t('cert.download', 'Download certificate')}
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={() => router.push(certificate.verification_url)}>
                {t('cert.openVerification', 'Open verification page')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : result ? (
        <Card className={result.passed ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.passed ? <BadgeCheck className="h-5 w-5 text-emerald-600" /> : <RefreshCcw className="h-5 w-5 text-rose-600" />}
              {result.passed ? t('cert.result.passed', 'You passed') : t('cert.result.tryLater', 'Try again later')}
            </CardTitle>
            <CardDescription>
              {t('cert.score', 'Score')}: {result.score}% • {t('cert.passing.title', 'Passing score')}: {settings.passing_score}%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!result.passed && retryLabel && (
              <p className="text-sm text-muted-foreground">{t('cert.nextRetry', 'Next retry opens')}: {retryLabel}</p>
            )}
            {result.passed ? (
              <Button onClick={() => router.refresh()}>
                {t('cert.refreshStatus', 'Refresh certificate status')}
              </Button>
            ) : (
              <Button variant="outline" onClick={startExam} disabled={activeAttemptBlocked}>
                {t('cert.startAnotherAttempt', 'Start another attempt')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('cert.exam', 'Certification exam')}</CardTitle>
            <CardDescription>
              {totalQuestions} {t('cert.questionsReady', 'questions are ready. The exam timer will start when you begin.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('cert.examDuration', 'Exam duration')}</p>
                <p className="font-medium">{Math.floor(maxSeconds / 60)} {t('cert.minutes', 'minutes')}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('cert.questionCount', 'Question count')}</p>
                <p className="font-medium">{totalQuestions}</p>
              </div>
            </div>

            {activeAttemptBlocked ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                {t('cert.mustWaitUntil', 'You must wait until')} {retryLabel} {t('cert.beforeRetry', 'before trying again.')}
              </div>
            ) : (
              <Button onClick={startExam} disabled={!totalQuestions || submitting}>
                {t('cert.startExam', 'Start certification exam')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {examStarted && questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('cert.answerAll', 'Answer all questions')}</CardTitle>
            <CardDescription>{t('cert.answerAll.subtitle', 'Choose one option for each question. Submitting locks the attempt.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((question, questionIndex) => (
              <div key={question.id ?? questionIndex} className="rounded-lg border p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('cert.question', 'Question')} {questionIndex + 1}</p>
                    <h3 className="text-base font-semibold">{question.question}</h3>
                  </div>
                </div>

                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                      <input
                        type="radio"
                        name={`question-${questionIndex}`}
                        checked={selectedAnswers[questionIndex] === optionIndex}
                        onChange={() => updateAnswer(questionIndex, optionIndex)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <Separator />

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => submitExam(false)} disabled={submitting || !examStarted}>
                {t('cert.submitExam', 'Submit exam')}
              </Button>
              <Button variant="outline" onClick={() => setExamStarted(false)} disabled={submitting}>
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
