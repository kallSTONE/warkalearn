"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useSupabase } from "@/components/providers/supabase-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { translate } from "@/lib/i18n"

import { LessonSidebar } from "@/components/lesson-sidebar"
import { LessonContent } from "@/components/lesson-content"
import { TesfaAssistant } from "@/components/tesfa-assistant"

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const lessonNumber = parseInt(params.lesson_number as string, 10)
  const [downloads, setDownloads] = useState<any[]>([])

  const [courseData, setCourseData] = useState<any>(null)
  const [currentLesson, setCurrentLesson] = useState<any>(null)
  const [currentLessonId, setCurrentLessonId] = useState<string>("")
  const [loading, setLoading] = useState(true)

  const { user } = useSupabase()
  const { locale } = useLanguage()
  const t = (key: string, fallback?: string) => translate(locale, key, fallback)

  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [hasCertification, setHasCertification] = useState(false)

  const normalizeTopics = (topics: any): { title: string; description: string }[] => {
    if (!topics) return []
    if (Array.isArray(topics)) {
      return topics
        .map((item) => {
          if (typeof item === "string") return { title: item, description: "" }
          if (item && typeof item === "object") {
            if (typeof item.title === "string") {
              return { title: item.title, description: item.description ?? "" }
            }
            if (typeof item.key === "string") {
              return { title: item.key, description: item.value ?? "" }
            }
          }
          return null
        })
        .filter((item): item is { title: string; description: string } => !!item)
    }
    if (typeof topics === "object") {
      return Object.entries(topics).map(([title, description]) => ({
        title,
        description: String(description ?? ""),
      }))
    }
    return []
  }

  const isAuthChecking = user === undefined
  const userRole = user?.user_metadata?.role
  const isAuthorized = !!user && (userRole === "admin" || userRole === "lawyer" || userRole === "reviewer")

  // ------------------------------
  // Auth check
  // ------------------------------
  useEffect(() => {
    if (user === undefined) return
    if (!user) {
      router.push("/login")
      return
    }
    const role = user.user_metadata?.role
    if (role !== "admin" && role !== "lawyer" && role !== "reviewer") router.push("/")
  }, [user, router])

  // ------------------------------
  // Load course, lesson, downloads
  // ------------------------------



  useEffect(() => {
    if (!slug || !lessonNumber || !user) return

    const load = async () => {
      setLoading(true)

      // 1) Load course + lessons
      const cached = localStorage.getItem(`course_lessons_${slug}`)
      if (cached) {
        try {
          setCourseData(JSON.parse(cached))
        } catch { }
      }

      const { data: courseDataRaw, error } = await supabase
        .from("courses")
        .select("id, title, lessons(*)")
        .eq("slug", slug)
        .single()

      if (error || !courseDataRaw) {
        console.warn("Error loading course/lessons:", error)
        setLoading(false)
        return
      }

      // Determine which lessons are completed for this user
      const lessonIds: number[] = (courseDataRaw.lessons || []).map((l: any) => l.id)
      let completedLessonIdSet = new Set<number>()
      if (lessonIds.length > 0) {
        const { data: completions, error: completionsError } = await supabase
          .from("lesson_quiz_completions")
          .select("lesson_id")
          .in("lesson_id", lessonIds)
          .eq("user_id", user.id)

        if (completionsError) {
          console.warn("Error loading lesson completions:", completionsError)
        } else if (completions) {
          completedLessonIdSet = new Set<number>(completions.map((c: any) => c.lesson_id))
        }
      }

      const lessonsForSidebar = (courseDataRaw.lessons || [])
        .sort((a: any, b: any) => a.step_order - b.step_order)
        .map((l: any) => {
          const isCompleted = completedLessonIdSet.has(l.id)
          return {
            id: l.id.toString(),
            number: l.step_order,
            title: l.title,
            completed: isCompleted,
            progress: isCompleted ? 100 : 0,
            topics: normalizeTopics(l.topics),
          }
        })

      const preparedCourseData = {
        courseId: courseDataRaw.id.toString(),
        lessons: lessonsForSidebar,
      }

      const { data: certificationData } = await supabase
        .from("certification_settings")
        .select("enabled")
        .eq("course_id", courseDataRaw.id)
        .maybeSingle()

      setHasCertification(Boolean(certificationData?.enabled))

      setCourseData(preparedCourseData)
      localStorage.setItem(`course_lessons_${slug}`, JSON.stringify(preparedCourseData))

      // 2) Current lesson
      const lessonMatch = courseDataRaw.lessons.find((l: any) => l.step_order === lessonNumber)
      if (!lessonMatch) {
        router.push(`/learn/course/${slug}/lesson/1`)
        setLoading(false)
        return
      }

      setCurrentLesson({
        id: lessonMatch.id.toString(),
        title: lessonMatch.title,
        summary: lessonMatch.description || "",
        videoUrl: lessonMatch.video_url,
        step_order: lessonMatch.step_order,
        topics: normalizeTopics(lessonMatch.topics),
      })
      setCurrentLessonId(lessonMatch.id.toString())

      // 2.5) Load downloads for lesson
      const { data: downloadsData, error: downloadsError } = await supabase
        .from("lesson_downloads")
        .select("*")
        .eq("lesson_id", lessonMatch.id)
        .order("modified_at", { ascending: false })

      if (downloadsError) {
        console.warn("Error loading lesson downloads:", downloadsError)
      }

      setDownloads(downloadsData || [])

      // 3) Load quiz for lesson
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("id, is_required")
        .eq("lesson_id", lessonMatch.id)
        .single()

      if (quizData) {
        setQuiz(quizData)

        // Load questions
        const { data: questionsData } = await supabase
          .from("quiz_questions")
          .select("questions")
          .eq("quiz_id", quizData.id)
          .single()

        if (questionsData?.questions && Array.isArray(questionsData.questions)) {
          setQuestions(questionsData.questions)
        }

        // Check if user already completed
        const { data: completion } = await supabase
          .from("lesson_quiz_completions")
          .select("id")
          .eq("lesson_id", lessonMatch.id)
          .eq("user_id", user.id)
          .maybeSingle()

        if (completion?.id) {
          setQuizCompleted(true)
        }
      }

      setLoading(false)
    }

    load()
  }, [slug, lessonNumber, user, router])

  // Reflect completion immediately in sidebar when quiz completes
  useEffect(() => {
    if (!quizCompleted || !currentLessonId) return
    setCourseData((prev: any) => {
      if (!prev) return prev
      const target = prev.lessons.find((l: any) => l.id === currentLessonId)
      if (!target) return prev
      if (target.completed && target.progress === 100) return prev
      const updated = {
        ...prev,
        lessons: prev.lessons.map((l: any) =>
          l.id === currentLessonId ? { ...l, completed: true, progress: 100 } : l
        ),
      }
      try {
        localStorage.setItem(`course_lessons_${slug}`, JSON.stringify(updated))
      } catch { }
      return updated
    })
  }, [quizCompleted, currentLessonId, slug])

  // ------------------------------
  // Navigation
  // ------------------------------
  const handlePrevious = () => {
    if (!courseData || !currentLesson) return
    const sorted = [...courseData.lessons].sort((a: any, b: any) => a.number - b.number)
    const idx = sorted.findIndex((l: any) => l.id === currentLesson.id)
    if (idx > 0) {
      const prev = sorted[idx - 1]
      router.push(`/learn/course/${slug}/lesson/${prev.number}`)
    }
  }

  const handleNext = () => {
    if (!courseData || !currentLesson) return
    const sorted = [...courseData.lessons].sort((a: any, b: any) => a.number - b.number)
    const idx = sorted.findIndex((l: any) => l.id === currentLesson.id)
    if (idx < sorted.length - 1) {
      const next = sorted[idx + 1]
      router.push(`/learn/course/${slug}/lesson/${next.number}`)
      return
    }

    if (hasCertification) {
      router.push(`/learn/course/${slug}/certification`)
    }
  }

  const isLastLesson = Boolean(
    courseData &&
    currentLesson &&
    [...courseData.lessons].sort((a: any, b: any) => a.number - b.number).findIndex((l: any) => l.id === currentLesson.id) ===
      courseData.lessons.length - 1
  )

  if (isAuthChecking) return <div className="p-6 text-center">{t('lesson.authChecking', 'Checking authentication...')}</div>
  if (!isAuthorized) return <div className="p-6 text-center">{t('lesson.authChecking', 'Checking authentication...')}</div>
  if (loading || !courseData || !currentLesson) {
    return <div className="p-6 text-center">{t('lesson.loading', 'Loading lesson...')}</div>
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {slug.charAt(0).toUpperCase() + slug.slice(1)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('lesson.lesson', 'Lesson')} {currentLesson.step_order} {t('common.of', 'of')} {courseData.lessons.length}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row flex-1 items:center md:justify-center overflow-scroll md:overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:block overflow-hidden">
          <LessonSidebar
            courseData={courseData}
            currentLessonId={currentLessonId}
            onLessonSelect={(id) => {
              const lesson = courseData.lessons.find((l: any) => l.id === id)
              if (lesson) router.push(`/learn/course/${slug}/lesson/${lesson.number}`)
            }}
            hasCertification={hasCertification}
            onCertificationSelect={() => router.push(`/learn/course/${slug}/certification`)}
          />
        </div>

        {/* Lesson Content */}
        <div className="flex-1 min-h-screen overflow-scroll">
          <LessonContent
            lessonNumber={currentLesson.step_order.toString()}
            lessonTitle={currentLesson.title}
            videoUrl={currentLesson.videoUrl}
            summary={currentLesson.summary}
            hasResources={downloads.length > 0}
            topics={currentLesson.topics}
            onPrevious={handlePrevious}
            onNext={handleNext}
            isLastLesson={isLastLesson}
            hasCertification={hasCertification}
            courseId={courseData.courseId}
            quiz={quiz}
            questions={questions}
            quizCompleted={quizCompleted}
            setQuizCompleted={setQuizCompleted}
            user={user}
            currentLessonId={currentLessonId}
            downloads={downloads}

          />
        </div>

        {/* Tesfa Assistant */}
        <div className="overflow-hidden">
          <TesfaAssistant />
        </div>
      </div>
    </div>
  )
}
