"use client"
  
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, Download } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/components/providers/language-provider"
import { translate } from "@/lib/i18n"
     
interface LessonContentProps {
  lessonNumber: string
  lessonTitle: string
  videoUrl?: string
  summary: string
  topics: { title: string; description: string }[]
  hasResources: boolean
  onPrevious: () => void
  onNext: () => void
  isLastLesson?: boolean
  hasCertification?: boolean
  courseId: string
  quiz?: { id: string; is_required: boolean }
  questions?: any[]
  quizCompleted: boolean
  setQuizCompleted: (completed: boolean) => void
  user: any  
  currentLessonId: string
  downloads: {
    id: number
    title: string
    description?: string
    file_url: string
    file_type: string
    file_size?: number
    modified_at: string
  }[]
}
    
export function LessonContent({
  lessonNumber,
  lessonTitle,
  videoUrl,
  summary,
  hasResources,
  topics,
  onPrevious,
  onNext,
  isLastLesson = false,
  hasCertification = false,
  courseId,
  quiz,
  questions = [],
  quizCompleted,
  setQuizCompleted,
  user,
  currentLessonId,
  downloads,
}: LessonContentProps) {
  const { locale } = useLanguage()
  const t = (key: string, fallback?: string) => translate(locale, key, fallback)
  const [activeTab, setActiveTab] = useState("lesson")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)  
    
  const currentQuestion = questions[currentQuestionIndex]
  const nextButtonLabel = isLastLesson && hasCertification ? t('lessonContent.getCertified', 'Get certified') : t('common.next', 'Next')
    
  function getYouTubeEmbedUrl(url?: string) {
    if (!url) return ""  
      
    const directEmbedMatch = url.match(/youtube\.com\/embed\/([^?&/]+)/)
    const watchMatch = url.match(/[?&]v=([^?&/]+)/)
    const shortMatch = url.match(/youtu\.be\/([^?&/]+)/)
    const videoId = directEmbedMatch?.[1] || watchMatch?.[1] || shortMatch?.[1]
       
    if (!videoId) return url
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
  }     
  
  function getDriveDownloadUrl(url: string) {
    const match = url.match(/\/file\/d\/([^/]+)/)
    if (!match) return url
    return `https://drive.google.com/uc?export=download&id=${match[1]}`
  }

  /**
   * Handles quiz answer submission.
   * Progress calculation is NOT done here.
   * The database is the source of truth.
   */
  const handleSubmitAnswer = async () => {
    if (!quiz || !currentQuestion || selectedAnswerIndex === null) return
    if (submitting || quizCompleted) return

    setSubmitting(true)

    const correctIndex = currentQuestion.correct_option
    const correct = selectedAnswerIndex === correctIndex
    setIsCorrect(correct)

    const isLastQuestion = currentQuestionIndex === questions.length - 1

    try {
      if (isLastQuestion) {
        const lessonId = Number(currentLessonId)
        if (!Number.isFinite(lessonId)) {
          throw new Error("Invalid lesson id")
        }
        // 1️⃣ Record quiz completion (idempotent via unique constraint)
        await supabase.from("lesson_quiz_completions").insert({
          user_id: user.id,
          lesson_id: lessonId,
          quiz_id: quiz.id,
        })

        // 2️⃣ Update course progress (DB decides if quiz is required)
        await supabase.rpc("update_course_progress_for_quiz", {
          p_user_id: user.id,
          p_quiz_id: quiz.id,
        })

        setQuizCompleted(true)
      }
    } catch (err) {
      console.warn("Quiz submission / progress update failed:", err)
    }

    // Move to next question (UX)
    setTimeout(() => {
      setIsCorrect(null)
      setSelectedAnswerIndex(null)
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((i) => i + 1)
      }
      setSubmitting(false)
    }, 800)
  }

  return (
    <Card className="flex h-full flex-col border-0 rounded-none shadow-none bg-transparent gap-4 p-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col ">
        <TabsList className="w-fit">
          <TabsTrigger value="lesson">{t('lesson.lesson', 'Lesson')}</TabsTrigger>
          <TabsTrigger value="downloads">{t('lessonContent.downloads', 'Downloads')}</TabsTrigger>
        </TabsList>

        {/* Lesson Tab */}
        <TabsContent value="lesson" className="flex-1 flex flex-col gap-6 overflow-y-auto py-4 mb-4 pr-2 bg-transparent pb-24">
          {/* Video */}
          <div className="w-full aspect-video overflow-hidden rounded-lg border border-border bg-black">
            {videoUrl ? (
              <iframe
                src={getYouTubeEmbedUrl(videoUrl)}
                title={lessonTitle}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                {t('lessonContent.videoUnavailable', 'Video unavailable for this lesson.')}
              </div>
            )}
          </div>

          {/* Lesson Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t('lesson.lesson', 'Lesson')} {lessonNumber}: {lessonTitle}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">{summary}</p>
          </div>

          {/* Topics */}
          <div className="flex-1">
            <div className="mt-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">{t('lessonContent.topicsCovered', 'Topics Covered')}</h3>
              <div className="flex flex-col gap-4">
                {topics.map((topic) => (
                  <div key={topic.title} className="border rounded-md p-4 bg-card">
                    <h4 className="text-md font-medium text-foreground">{topic.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Inline Quiz */}
            {quiz && questions.length > 0 && (
              <div className="mt-16 border rounded-sm text-muted-foreground border-border p-4 text-md flex flex-col gap-4">
                <h2 className="text-center font-bold mb-2">{t('lessonContent.quiz', 'Quiz')}</h2>
                <p className="mb-2 font-medium">{currentQuestion.question}</p>
                <div className="flex flex-col gap-2">
                  {currentQuestion.options.map((opt: string, idx: number) => (
                    <label key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`question-${currentQuestionIndex}`}
                        value={idx}
                        checked={selectedAnswerIndex === idx}
                        onChange={() => setSelectedAnswerIndex(idx)}
                        disabled={quizCompleted}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                {isCorrect !== null && (
                  <div className={`mt-2 font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                    {isCorrect ? t('lessonContent.correct', 'Correct!') : t('lessonContent.incorrect', 'Incorrect')}
                  </div>
                )}
                <Button
                  className="mt-2"
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswerIndex === null || submitting || quizCompleted}
                >
                  {currentQuestionIndex === questions.length - 1 ? t('lessonContent.submitQuiz', 'Submit Quiz') : t('lessonContent.nextQuestion', 'Next Question')}
                </Button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={onPrevious} className="gap-2 bg-transparent">
              <ChevronLeft className="w-4 h-4" />
              {t('common.previous', 'Previous')}
            </Button>
            <Button
              variant="outline"
              onClick={onNext}
              disabled={quiz?.is_required && !quizCompleted}
              className="gap-2 bg-transparent"
            >
              {nextButtonLabel}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </TabsContent>

        {/* Downloads Tab */}
        <TabsContent value="downloads" className="flex-1">
          {downloads.length > 0 ? (
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="p-3 w-8"></th>
                    <th className="p-3">{t('common.title', 'Title')}</th>
                    <th className="p-3 hidden sm:table-cell">{t('common.type', 'Type')}</th>
                    <th className="p-3 hidden md:table-cell">{t('common.size', 'Size')}</th>
                    <th className="p-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {downloads.map((file) => (
                    <tr key={file.id} className="border-t hover:bg-muted/50">
                      <td className="p-3">
                        📄
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{file.title}</div>
                        {file.description && (
                          <div className="text-xs text-muted-foreground">
                            {file.description}
                          </div>
                        )}
                      </td>
                      <td className="p-3 hidden sm:table-cell uppercase">
                        {file.file_type}
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : t('common.noneDash', '—')}
                      </td>
                      <td className="p-3">
                        <Button
                          type="button"
                          onClick={() => {
                            const downloadUrl = getDriveDownloadUrl(file.file_url)
                            window.open(downloadUrl, '_blank')
                          }}
                          className="p-2  border border-red-899"
                          size="icon" variant="ghost">
                          <Download className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              {t('lessonContent.noDownloads', 'No downloads available for this lesson yet.')}
            </div>
          )}
        </TabsContent>

      </Tabs>
    </Card>
  )
}