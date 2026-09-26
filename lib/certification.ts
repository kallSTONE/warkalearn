export type CertificationSettings = {
  enabled: boolean
  passing_score: number
  time_per_question_minutes: number
  retry_cooldown_hours: number
  question_limit: number | null
  verification_base_url: string
  certificate_title: string
  issuer_name: string
  logo_path: string
  template_variant: string
}   
         
     
export type CertificationQuestion = {
  id?: string  
  question: string
  options: string[]
  correct_option: number
  explanation?: string | null
  sort_order?: number
  active?: boolean
}   
     
export type CertificationAttempt = {
  id: string
  score: number
  passed: boolean
  started_at: string
  submitted_at: string | null
  next_retry_at: string | null
  attempt_number: number
}

export type CourseLessonSummary = {
  id: string
  completed: boolean
  progress: number
}   
    
export const DEFAULT_CERTIFICATION_SETTINGS: CertificationSettings = {
  enabled: false,
  passing_score: 70,
  time_per_question_minutes: 2,
  retry_cooldown_hours: 48,
  question_limit: null,
  verification_base_url: 'https://earn-neway.vercel.app/certverify',
  certificate_title: 'Course Certification',
  issuer_name: 'Neway',
  logo_path: '/assets/images/warkalogo.png',
  template_variant: 'premium-minimal',
}

export const normalizeCertificationSettings = (
  settings?: Partial<CertificationSettings> | null
): CertificationSettings => ({
  ...DEFAULT_CERTIFICATION_SETTINGS,
  ...(settings ?? {}),
})

export const getCompletedLessonsCount = (lessons: CourseLessonSummary[]) =>
  lessons.filter((lesson) => lesson.completed || lesson.progress >= 100).length

export const isCertificationUnlocked = (lessons: CourseLessonSummary[]) => {
  if (!lessons.length) return false
  const completionPercent = (getCompletedLessonsCount(lessons) / lessons.length) * 100
  return completionPercent > 50
}

export const getCertificationQuestionSet = (
  questions: CertificationQuestion[],
  questionLimit: number | null
) => {
  const activeQuestions = questions.filter((question) => question.active !== false)
  if (!questionLimit || questionLimit <= 0) return activeQuestions
  return activeQuestions.slice(0, questionLimit)
}

export const getCertificationDurationSeconds = (
  questionCount: number,
  timePerQuestionMinutes: number
) => Math.max(60, questionCount * Math.max(1, timePerQuestionMinutes) * 60)

export const buildVerificationUrl = (baseUrl: string, code: string) => {
  const trimmedBase = baseUrl.replace(/\/$/, '')
  return `${trimmedBase}/${encodeURIComponent(code)}`
}

export const formatCertificateCode = (raw?: string | null) => {
  if (!raw) return ''
  return raw.trim().toUpperCase()
}
