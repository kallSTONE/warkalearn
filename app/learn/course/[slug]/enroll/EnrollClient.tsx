'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useSupabase } from "@/components/providers/supabase-provider"
import { useRouteLoading } from "@/components/route-loading-provider"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { Loader2, BookOpen, Clock, AlertTriangle, CheckCircle2, Users, TrendingUp, Signal, Star, Video } from "lucide-react"
import localCourses from "@/public/data/courses.json"
import PaymentModal from './PaymentModal'
import { CourseHero } from "@/components/course/CourseHero"
import { useLanguage } from "@/components/providers/language-provider"
import { formatEthiopianBirr } from '@/lib/shop'

interface CourseMedia {
  id: number
  course_id: number
  type: 'intro' | 'lesson' | 'trailer' | string
  provider: 'youtube' | string
  url: string
}

interface Course {
  id: number
  title: string
  slug: string
  description: string
  category: string
  level: string
  estimated_hours: number
  requirements?: string
  skills?: string
  students?: number
  rating?: number
  hero_image?: string
  is_paid?: boolean
  price?: number | null
  lessons?: {
    id: number
    title: string
    description?: string
    estimated_time?: number
    topics: string[],
    step_order?: number
  }[]
  media?: CourseMedia[]
}

interface Instructor {
  id: number
  name: string
  role: string
  avatar: string
}

interface Review {
  id: number
  user: string
  rating: number
  comment: string
}

export default function EnrollClient({ slug }: { slug: string }) {
  const router = useRouter()
  const { startLoading } = useRouteLoading()
  const { user, loading: userLoading } = useSupabase()
  const [course, setCourse] = useState<Course | null>(null)
  const [status, setStatus] = useState<"idle" | "checking" | "enrolled" | "already" | "error">("idle")
  const [loading, setLoading] = useState(true)

  const dummyInstructors: Instructor[] = [
    { id: 1, name: "Alice Johnson", role: "Lead Instructor", avatar: "../../../../public/assets/images/instructors/avatar.jpg" },
  ]

  const dummyReviews: Review[] = [
    { id: 1, user: "John D.", rating: 5, comment: "Amazing course, learned a lot!" },
    { id: 2, user: "Mary S.", rating: 4, comment: "Well structured and easy to follow." },
    { id: 3, user: "Ahmed K.", rating: 5, comment: "Highly recommend this course!" },
  ]

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const { t } = useLanguage()

  // Fetch course data
  useEffect(() => {
    if (!slug) return

    const cacheKey = "courses"
    const mapLocalCourse = (c: any): Course => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description || "",
      hero_image: c.hero_image || c.image || "/assets/images/default.jpg",
      category: c.category,
      level: c.level,
      estimated_hours: c.estimated_hours || 0,
      requirements: c.requirements || "Basic",
      skills: c.skills || "",
      students: c.students || 0,
      rating: c.rating || 0,
      is_paid: Boolean(c.is_paid),
      price: c.price ?? null,
      lessons: c.lessons || [],
      media: c.course_media || c.media || [],
    })

    const hydrateFromCache = () => {
      const cached = localStorage.getItem(cacheKey)
      if (!cached) return false
      try {
        const cachedCourses = JSON.parse(cached)
        const match = cachedCourses?.find((c: any) => c.slug === slug)
        if (match) {
          setCourse(mapLocalCourse(match))
          return true
        }
      } catch {
        localStorage.removeItem(cacheKey)
      }
      return false
    }

    const hydrateFromLocal = () => {
      const match = (localCourses as any[]).find((c: any) => c.slug === slug)
      if (match) {
        const mapped = mapLocalCourse(match)
        setCourse(mapped)
        return true
      }
      return false
    }

    const didHydrate = hydrateFromCache()
    if (!didHydrate) {
      hydrateFromLocal()
    }

    // Fetch from Supabase
    const fetchCourse = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("courses")
        .select("*, lessons(*), course_media(*)")
        .eq("slug", slug)
        .single()


      if (!error && data) {
        const mapped = {
          id: data.id,
          title: data.title,
          slug: data.slug,
          description: data.description || "",
          hero_image: data.hero_image || "/assets/images/default.jpg",
          category: data.category ?? "",
          level: data.level ?? "",
          estimated_hours: data.estimated_hours || 0,
          requirements: data.requirements || "Basic",
          skills: data.skills || "",
          students: data.students || 0,
          rating: data.rating || 0,
          is_paid: Boolean(data.is_paid),
          price: data.price ?? null,
          lessons: (data.lessons || []).map((lesson: any) => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            estimated_time: lesson.estimated_time,
            topics: lesson.topics,
            step_order: lesson.step_order,
          })),
          media: data.course_media || [],
        }
        setCourse(mapped)

        try {
          const cached = localStorage.getItem(cacheKey)
          const cachedCourses = cached ? JSON.parse(cached) : []
          const next = Array.isArray(cachedCourses)
            ? cachedCourses.filter((c: any) => c.slug !== slug)
            : []
          next.push(mapped)
          localStorage.setItem(cacheKey, JSON.stringify(next))
        } catch {
          localStorage.removeItem(cacheKey)
        }
      }
      setLoading(false)
    }

    fetchCourse()
  }, [slug])

  // Check existing enrollment so we can show a Go To Course CTA immediately
  useEffect(() => {
    const checkEnrollment = async () => {
      if (!user || !course) return
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .maybeSingle()
      if (!error) {
        setIsEnrolled(Boolean(data))
        if (data) setStatus("already")
      }
    }
    checkEnrollment()
  }, [user, course])


  const handleEnroll = async (amountPaid?: number) => {
    if (!user) {
      localStorage.setItem("redirectAfterLogin", `/learn/course/${slug}/`)
      startLoading()
      router.push("/login")
      return
    }

    if (!course) return
    setStatus("checking")

    try {
      // 1️⃣ Check if already enrolled
      const { data: existingEnrollment, error: existingError } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .maybeSingle()

      if (existingError) throw existingError

      if (existingEnrollment) {
        setStatus("already")
        return
      }

      // 2️⃣ Create new enrollment
      const { data: enrollment, error: enrollError } = await supabase
        .from("course_enrollments")
        .insert({
          user_id: user.id,
          course_id: course.id,
          amount_paid: Number(amountPaid ?? 0),
        })
        .select("id")
        .single()

      if (enrollError) throw enrollError

      // 3️⃣ Initialize progress
      const { error: progressError } = await supabase
        .from("course_progress")
        .insert({
          enrollment_id: enrollment.id,
          progress_percentage: 0,
          completed: false,
        })

      if (progressError) throw progressError

      // 4️⃣ Success — show status and redirect
      setStatus("enrolled")
      setIsEnrolled(true)

      setTimeout(() => {
        startLoading()
        router.push(`/learn/course/${slug}/lesson/1`)
      }, 2000)
    } catch (error: any) {
      console.error("Enrollment failed:", error)
      setStatus("error")
    }
  }


  const handleEnrollClick = async () => {
    if (!user) {
      localStorage.setItem(
        "redirectAfterLogin",
        `/learn/course/${slug}/`
      )
      startLoading()
      router.push("/login")
      return
    }

    if (!course) return

    setStatus("checking")

    const { data: existing, error } = await supabase
      .from("course_enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .maybeSingle()

    if (error) {
      console.error(error)
      setStatus("error")
      return
    }

    if (existing) {
      setStatus("already")
      return
    }

    setStatus("idle")
    if (course.is_paid) {
      setShowPaymentModal(true)
    } else {
      setShowConfirmModal(true)
    }
  }


  if (!course)
    return (
      <div className="container mx-auto pt-0 pb-8 flex flex-col md:flex-row gap-12">
        {/* Left Column Skeleton */}
        <div className="flex-1 space-y-8 px-4 pb-4 pt-0 md:px-8">
          <div className="h-8 md:h-10 w-2/3 rounded bg-muted animate-pulse" />
          <div className="w-full aspect-video rounded-lg bg-muted animate-pulse" />

          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`meta-skel-${i}`} className="h-4 w-24 rounded bg-muted animate-pulse" />
            ))}
          </div>

          <div className="space-y-8 border border-border p-6">
            <div className="space-y-3">
              <div className="h-6 w-40 rounded bg-muted animate-pulse" />
              <div className="h-4 w-full rounded bg-muted animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="h-6 w-56 rounded bg-muted animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="h-6 w-32 rounded bg-muted animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`lesson-skel-${i}`} className="h-10 w-full rounded bg-muted animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="md:w-[30%] sticky top-24 self-start space-y-4">
          <Card className="p-4 border border-border">
            <div className="space-y-4 my-6">
              <div className="space-y-2">
                <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                <div className="h-4 w-full rounded bg-muted animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-40 rounded bg-muted animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-36 rounded bg-muted animate-pulse" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`skill-skel-${i}`} className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                ))}
              </div>
            </div>
            <div className="h-12 w-full rounded bg-muted animate-pulse" />
          </Card>
        </div>
      </div>
    )

  const introVideo = course.media?.find(
    (m) => m.type === "intro" && m.provider === "youtube"
  )


  return (
    <div className="container mx-auto pt-0 pb-8 flex flex-col md:flex-row gap-12">
      {/* Left Column: Course Details */}
      <div className="flex-1 space-y-8 px-4 pb-4 pt-0 md:px-8">
        {/* Hero */}
        <h1 className="text-xl md:text-4xl mt-2 font-bold">{course.title}</h1>
        <CourseHero
          videoUrl={introVideo?.url}
          poster={course.hero_image || "/assets/images/default.jpg"}
          title={course.title}
          description={course.description}
          showSeekControls
          autoPlay={true}
          loop={true}
          muted={false}
        />

        {/* Course Info */}
        <div className="flex flex-wrap gap-4 jtext-sm text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4" /> {course.category}</span>
          <span className="flex items-center gap-1"><Signal className="w-4 h-4" /> {course.level}</span>
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {course.estimated_hours} {t('learn.course.hours', 'hrs')}</span>
          <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {course.students?.toLocaleString() || 0} {t('enroll.meta.students', 'students')}</span>
          <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400" /> {course.rating || 0}</span>
        </div>


        <div className="space-y-12 border border-border p-6">

          {/* About course */}
          <div>
            <h2 className="text-2xl font-bold mb-4">📚 {t('enroll.about.title', 'About this Course')}</h2>
            <p>{course.description}</p>
          </div>

          {/* {Course requirement} */}
          <div>
            <h2 className="text-2xl font-bold mb-4">🛠 {t('enroll.requirements.title', 'Course Requirements')}</h2>
            <p>{course.requirements || t('enroll.requirements.none', 'No specific prerequisites required.')}</p>
          </div>

          {/* Lessons Accordion */}
          {course.lessons && course.lessons.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 mt-2"><BookOpen className="w-6 h-6" /> {t('enroll.lessons.title', 'Lessons')}</h2>
              <Accordion type="single" collapsible={false} className="space-y-2">
                {course.lessons.map((lesson) => (
                  <AccordionItem key={lesson.id} value={String(lesson.id)}>
                    <AccordionTrigger className="font-semibold">{lesson.step_order}. {lesson.title}</AccordionTrigger>
                    <AccordionContent>
                      {lesson.description && (
                        <p className="text-sm mb-2 text-muted-foreground">{lesson.description}</p>
                      )}

                      {lesson.topics && Object.keys(lesson.topics).length > 0 && (
                        <ul className="space-y-1 list-none">
                          {Object.entries(lesson.topics).map(([topicTitle, topicDesc]) => (
                            <li key={topicTitle} className="flex flex-col gap-1 hover:bg-primary/10 cursor-pointer dark:hover:bg-gray-800 p-2 rounded">
                              <span className="flex items-center gap-2">
                                <Video className="w-4 h-4 text-primary" />
                                <span className="ml-6 text-sm text-muted-foreground">{topicDesc}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </AccordionContent>

                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {/* Instructors Carousel */}
          <div>
            <h2 className="text-2xl font-bold my-6">👨‍🏫 {t('enroll.instructors.title', 'Instructors')}</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {dummyInstructors.map((inst) => (
                <div key={inst.id} className="flex-shrink-0 w-40 p-4 border rounded-lg shadow">
                  <img src={inst.avatar} alt={inst.name} className="w-16 h-16 rounded-full mx-auto mb-2 object-cover" />
                  <h3 className="text-center font-semibold">{inst.name}</h3>
                  <p className="text-center text-sm text-gray-500">{inst.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div>
            <h2 className="text-2xl font-bold mb-4">⭐ {t('enroll.reviews.title', 'Reviews')}</h2>
            <div className="space-y-4">
              {dummyReviews.map((rev) => (
                <Card key={rev.id}>
                  <CardContent>
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold">{rev.user}</p>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400" /> {rev.rating}
                      </span>
                    </div>
                    <p>{rev.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div>
            <h2 className="text-2xl font-bold mb-4">❓ {t('enroll.faq.title', 'Frequently Asked Questions')}</h2>
            <Accordion type="single" collapsible className="space-y-2">
              <AccordionItem value="q1">
                <AccordionTrigger>{t('enroll.faq.q1', 'What is the duration of the course?')}</AccordionTrigger>
                <AccordionContent>{t('enroll.faq.a1.prefix', 'The course is designed to be completed in approximately')} {course.estimated_hours} {t('learn.course.hours', 'hrs')}, {t('enroll.faq.a1.suffix', 'but you can take it at your own pace.')}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger>{t('enroll.faq.q2', 'Are there any prerequisites?')}</AccordionTrigger>
                <AccordionContent>{course.requirements || t('enroll.requirements.none', 'No specific prerequisites required.')}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3">
                <AccordionTrigger>{t('enroll.faq.q3', 'Will I receive a certificate upon completion?')}</AccordionTrigger>
                <AccordionContent>{t('enroll.faq.a3', 'Yes, upon successful completion of the course, you will receive a certificate to showcase your achievement.')}</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>


      </div>

      {/* Right Column: Sticky Enrollment */}
      <div className="md:w-[30%] sticky top-24 self-start space-y-4">

        <Card
          className="
            p-4
            border
            border-border
            shadow-[0_1px_0_hsl(30_15%_12%),0_10px_30px_hsl(28_30%_2%/0.7)]
            dark:shadow-[0_1px_0_hsl(30_15%_10%),0_16px_40px_hsl(28_30%_1%/0.8)]
          "
        >

          {/* Overview / Requirements / Skills */}
          <div className="space-y-4 my-6">
            <div>
              <h2 className="font-semibold text-lg">📘 {t('enroll.overview.title', 'Overview')}</h2>
              <p>{course.description}</p>
            </div>

            <div>
              <h2 className="font-semibold text-lg">🧠 {t('enroll.requirements.shortTitle', 'Requirements')}</h2>
              <p>{course.requirements || t('enroll.requirements.none', 'No specific prerequisites required.')}</p>
            </div>

            <div>
              <h2 className="font-semibold text-lg">💡 {t('enroll.skills.title', 'Skills You’ll Gain')}</h2>
              {course.skills ? (
                <ul className="list-disc list-inside space-y-1">
                  {course.skills.split(",").map((skill) => (
                    <li key={skill.trim()}>{skill.trim()}</li>
                  ))}
                </ul>
              ) : <p>{t('enroll.skills.none', 'No specific skills listed.')}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Price</div>
              <div className="text-lg font-semibold">{course.is_paid ? formatEthiopianBirr(course.price ?? 3000) : 'Free'}</div>
            </div>
            {isEnrolled ? (
              <Button
                onClick={() => {
                  startLoading()
                  router.push(`/learn/course/${slug}/lesson/1`)
                }}
                className="w-full text-lg font-semibold"
              >
                {t('enroll.action.continueCourse', 'Continue to Course')}
              </Button>
            ) : (
              (!user || user?.user_metadata?.role === 'lawyer') && (
                <Button
                  onClick={handleEnrollClick}
                  className="w-full text-lg font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.4)]"
                  disabled={status === "checking"}
                >
                  {status === "checking" && user?.user_metadata?.role == 'lawyer' ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" /> {t('enroll.action.processing', 'Processing...')}
                    </span>
                  ) : (
                    t('enroll.action.startCourse', 'Start Course')
                  )}
                </Button>
              )
            )}

            {user && user?.user_metadata?.role !== 'lawyer' && !isEnrolled && (
              <p className="text-center text-sm text-red-500">{t('enroll.error.roleRequired', 'You must be a lawyer to enroll.')}</p>
            )}

            {!isEnrolled && status === "enrolled" && (
              <div className="flex flex-col items-center space-y-1 text-green-600">
                <CheckCircle2 className="w-6 h-6" />
                <p>{t('enroll.status.success', 'Enrollment successful! Redirecting to your course...')}</p>
              </div>
            )}
            {!isEnrolled && status === "already" && (
              <div className="flex flex-col items-center space-y-1 text-blue-600">
                <CheckCircle2 className="w-6 h-6" />
                <p>{t('enroll.status.already', 'You are already enrolled.')}</p>
                <Button
                  onClick={() => {
                    startLoading()
                    router.push(`/learn/course/${slug}/lesson/1`)
                  }}
                >
                  {t('enroll.action.continueCourse', 'Continue to Course')}
                </Button>
              </div>
            )}
            {status === "error" && (
              <div className="flex flex-col items-center space-y-1 text-red-600">
                <AlertTriangle className="w-6 h-6" />
                <p>{t('enroll.error.generic', 'Something went wrong. Please try again.')}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {loading && (
        <p className="text-center text-sm text-gray-500 mt-4">{t('enroll.refreshing', 'Refreshing data...')}</p>
      )}

      {course && (
        <PaymentModal
          open={showPaymentModal}
          course={course}
          courseId={course.id}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={(amountPaid) => {
            setShowPaymentModal(false)
            handleEnroll(Number(amountPaid ?? course.price ?? 3000))
          }}
          onRewardCodeSuccess={() => {
            setShowPaymentModal(false)
            setStatus('already')
            setIsEnrolled(true)
            setTimeout(() => {
              startLoading()
              router.push(`/learn/course/${slug}/lesson/1`)
            }, 1000)
          }}
        />
      )}

      {/* Free course confirmation */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('enroll.confirm.title', 'Start this course?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('enroll.confirm.description', 'This course is free. We\'ll enroll you and initialize your progress.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmModal(false)}>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmModal(false)
                handleEnroll(0)
              }}
            >
              {t('enroll.action.enroll', 'Enroll')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
