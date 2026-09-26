'use client'

import { useEffect, useState } from 'react'
import TransitionLink from '@/components/transition-link'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useSupabase } from '@/components/providers/supabase-provider'
import { useLanguage } from '@/components/providers/language-provider'
import { translate } from '@/lib/i18n'
import {
  BookOpen,
  Users,
  MessageCircle,
  Award,
  BarChart3,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react'

type EnrolledCourse = {
  enrollment_id: string
  enrolled_at: string
  progress: number
  completed: boolean
  course: {
    id: number
    title: string
    slug: string
    hero_image: string | null
    estimated_hours: number | null
  }
  firstLessonId: number | null
  nextLessonTitle: string | null
}

type DashboardStats = {
  coursesInProgress: number
  certificatesEarned: number
  learningHours: number
  forumPosts: number
}

type DashboardDiscussion = {
  id: string
  title: string
  latestReply: string
  replies: number
}

type DashboardEvent = {
  id: string
  title: string
  date: string
  duration: string
}

type LiveSchedule = {
  id: string
  liveClassId: string
  title: string
  startAt: string
  platform: string
  meetingUrl: string | null
  paymentStatus: string
  registrationStatus: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading, supabase } = useSupabase()
  const { locale } = useLanguage()
  const t = (key: string, fallback?: string) => translate(locale, key, fallback)
  const [courses, setCourses] = useState<EnrolledCourse[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    coursesInProgress: 0,
    certificatesEarned: 0,
    learningHours: 0,
    forumPosts: 0,
  })
  const [discussionUpdates, setDiscussionUpdates] = useState<DashboardDiscussion[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<DashboardEvent[]>([])
  const [liveSchedules, setLiveSchedules] = useState<LiveSchedule[]>([])
  const [sidebarLoading, setSidebarLoading] = useState(true)

  useEffect(() => {
    if (!loading) {
      if (!user || user.user_metadata?.role !== 'lawyer') {
        router.replace('/login')
      }
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    const fetchEnrolledCourses = async () => {
      setCoursesLoading(true)
      setSidebarLoading(true)

      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          id,
          enrolled_at,
          courses (
            id,
            title,
            slug,
            hero_image,
            estimated_hours
          )
        `)
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false })

      if (error) {
        console.error('Error fetching enrollments:', error)
        setCoursesLoading(false)
        setSidebarLoading(false)
        return
      }

      const formattedCourses: EnrolledCourse[] = await Promise.all(
        data.map(async (enrollment: any) => {
          // Fetch course progress for this enrollment (course_progress.enrollment_id -> course_enrollments.id)
          const { data: progressRow } = await supabase
            .from('course_progress')
            .select('progress_percentage, completed')
            .eq('enrollment_id', enrollment.id)
            .maybeSingle()

          // Determine first incomplete lesson for this user in this course
          const { data: courseLessons, error: lessonsError } = await supabase
            .from('lessons')
            .select('id, title, step_order')
            .eq('course_id', enrollment.courses.id)
            .order('step_order', { ascending: true })

          let firstIncompleteLesson: { id: number; title: string; step_order: number } | null = null
          if (!lessonsError && courseLessons && courseLessons.length > 0) {
            const lessonIds = courseLessons.map((l: any) => l.id)
            const { data: completions } = await supabase
              .from('lesson_quiz_completions')
              .select('lesson_id')
              .in('lesson_id', lessonIds)
              .eq('user_id', user.id)

            const completedSet = new Set<number>((completions || []).map((c: any) => c.lesson_id))
            firstIncompleteLesson = (courseLessons as any[]).find((l: any) => !completedSet.has(l.id)) || null
          }

          return {
            enrollment_id: enrollment.id,
            enrolled_at: enrollment.enrolled_at,
            progress: progressRow?.progress_percentage ?? 0,
            completed: progressRow?.completed ?? false,
            course: enrollment.courses,
            firstLessonId: firstIncompleteLesson?.step_order ?? null,
            nextLessonTitle: firstIncompleteLesson?.title ?? null,
          }
        })
      )

      setCourses(formattedCourses)

      const coursesInProgress = formattedCourses.filter((course) => !course.completed && course.progress < 100).length
      const learningHours = Number(
        formattedCourses
          .reduce((total, course) => total + ((course.course.estimated_hours ?? 0) * course.progress) / 100, 0)
          .toFixed(1)
      )

      const [{ count: certificatesEarned }, { count: forumPostsCount }, { data: topicRows, error: topicsError }, { data: retryRows, error: retriesError }, { data: liveRows, error: liveRowsError }] = await Promise.all([
        supabase
          .from('certificates')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('revoked_at', null),
        supabase
          .from('forum_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('forum_topics')
          .select('id, title')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(4),
        supabase
          .from('certification_attempts')
          .select('id, next_retry_at, courses(title)')
          .eq('user_id', user.id)
          .not('next_retry_at', 'is', null)
          .gte('next_retry_at', new Date().toISOString())
          .order('next_retry_at', { ascending: true })
          .limit(3),
        supabase
          .from('live_class_registrations')
          .select(`
            id,
            live_class_id,
            payment_status,
            registration_status,
            live_classes (
              id,
              title,
              start_at,
              meeting_platform,
              meeting_url
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ])

      if (topicsError) {
        console.error('Error fetching forum topics:', topicsError)
      }

      if (retriesError) {
        console.error('Error fetching certification retries:', retriesError)
      }

      if (liveRowsError) {
        console.error('Error fetching live class registrations:', liveRowsError)
      }

      const hydratedDiscussions: DashboardDiscussion[] = topicRows
        ? await Promise.all(
            topicRows.map(async (topic: any) => {
              const [{ count: replyCount }, { data: latestPostRows }] = await Promise.all([
                supabase
                  .from('forum_posts')
                  .select('id', { count: 'exact', head: true })
                  .eq('topic_id', topic.id),
                supabase
                  .from('forum_posts')
                  .select('content')
                  .eq('topic_id', topic.id)
                  .order('created_at', { ascending: false })
                  .limit(1),
              ])

              return {
                id: topic.id,
                title: topic.title,
                latestReply:
                  latestPostRows?.[0]?.content?.slice(0, 120) ||
                  t('dashboard.discussion.noRepliesYet', 'No replies yet'),
                replies: replyCount ?? 0,
              }
            })
          )
        : []

      const mappedUpcomingEvents: DashboardEvent[] = (retryRows || []).map((row: any) => ({
        id: row.id,
        title: `${t('dashboard.events.certificationRetry', 'Certification retry')}: ${row.courses?.title ?? t('dashboard.course', 'Course')}`,
        date: row.next_retry_at,
        duration: t('dashboard.events.duration.selfPaced', 'Self-paced'),
      }))

      const mappedLiveSchedules: LiveSchedule[] = (liveRows || [])
        .map((row: any) => ({
          id: row.id,
          liveClassId: row.live_class_id,
          title: row.live_classes?.title ?? t('dashboard.liveClasses.unknown', 'Live class'),
          startAt: row.live_classes?.start_at ?? row.created_at,
          platform: row.live_classes?.meeting_platform ?? t('dashboard.liveClasses.platform', 'Live session'),
          meetingUrl: row.live_classes?.meeting_url ?? null,
          paymentStatus: row.payment_status ?? 'paid',
          registrationStatus: row.registration_status ?? 'registered',
        }))
        .sort((a: LiveSchedule, b: LiveSchedule) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

      setStats({
        coursesInProgress,
        certificatesEarned: certificatesEarned ?? 0,
        learningHours,
        forumPosts: forumPostsCount ?? 0,
      })
      setDiscussionUpdates(hydratedDiscussions)
      setUpcomingEvents(mappedUpcomingEvents)
      setLiveSchedules(mappedLiveSchedules)
      setCoursesLoading(false)
      setSidebarLoading(false)
    }

    fetchEnrolledCourses()
  }, [user, supabase])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-pulse text-base sm:text-xl">{t('dashboard.loading', 'Loading dashboard...')}</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="container px-4 sm:px-6 lg:px-10 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-montserrat">
            {t('dashboard.welcome', 'Welcome')}, {user.user_metadata?.full_name || t('dashboard.student', 'Student')}
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.subtitle', 'Here is an overview of your learning journey')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none" asChild>
            <TransitionLink href="/learn">{t('dashboard.viewCourses', 'View Courses')}</TransitionLink>
          </Button>
          <Button className="flex-1 md:flex-none" asChild>
            <TransitionLink href="/dashboard/settings">{t('dashboard.editProfile', 'Edit Profile')}</TransitionLink>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg sm:text-xl flex items-center">
                  <BookOpen className="mr-2 h-5 w-5 text-primary" />
                  {t('dashboard.coursesInProgress', 'Courses in Progress')}
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <TransitionLink href="/dashboard">
                    {t('common.seeAll', 'See all')}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </TransitionLink>
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {coursesLoading ? (
                <div className="text-center py-6 text-muted-foreground">
                  {t('dashboard.loadingCourses', 'Loading your courses...')}
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">
                    {t('dashboard.noCourses', 'You have not enrolled in any courses yet')}
                  </p>
                  <Button asChild>
                    <TransitionLink href="/learn">{t('dashboard.viewCourses', 'View Courses')}</TransitionLink>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {courses.map((item) => (
                    <div
                      key={item.enrollment_id}
                      className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card/50"
                    >
                      <div className="w-full sm:w-1/4 h-32 sm:h-24 rounded-md overflow-hidden">
                        <img
                          src={
                            item.course.hero_image ||
                            'https://placehold.co/600x400'
                          }
                          alt={item.course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <h3 className="font-semibold">
                            {item.course.title}
                          </h3>
                          <span className="text-sm text-muted-foreground">
                            {item.progress}% {t('dashboard.completed', 'completed')}
                          </span>
                        </div>

                        <Progress value={item.progress} className="h-2 mb-2" />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                          <div className="text-sm leading-relaxed">
                            <span className="text-muted-foreground">
                              {t('dashboard.nextLesson', 'Next lesson')}:{' '}
                            </span>
                            {item.nextLessonTitle ?? '—'}
                          </div>

                          {item.firstLessonId && (
                            <Button size="sm" className="w-full sm:w-auto" asChild>
                              <TransitionLink
                                href={`/learn/course/${item.course.slug}/lesson/${item.firstLessonId}`}
                              >
                                    {t('dashboard.continue', 'Continue')}
                              </TransitionLink>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Class Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg sm:text-xl flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-primary" />
                  {t('dashboard.liveClasses.title', 'Live class schedule')}
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <TransitionLink href="/learn/live">
                    {t('dashboard.liveClasses.browse', 'Browse live classes')}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </TransitionLink>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sidebarLoading ? (
                <div className="text-center py-6 text-muted-foreground">
                  {t('dashboard.loading', 'Loading dashboard...')}
                </div>
              ) : liveSchedules.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  {t('dashboard.liveClasses.none', 'No live classes reserved yet')}
                </div>
              ) : (
                <div className="space-y-4">
                  {liveSchedules.map((session) => {
                    const sessionDate = new Date(session.startAt)
                    return (
                      <div key={session.id} className="rounded-lg border bg-card/50 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="font-semibold line-clamp-1">{session.title}</h3>
                            <p className="text-sm text-muted-foreground">{session.platform}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                              {session.paymentStatus}
                            </span>
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                              {session.registrationStatus}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>
                            {sessionDate.toLocaleDateString(locale)} {t('common.at', 'at')} {sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {session.meetingUrl ? (
                          <Button size="sm" variant="outline" className="mt-3 w-full sm:w-auto" asChild>
                            <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
                              {t('dashboard.liveClasses.join', 'Join session')}
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discussion Updates */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg sm:text-xl flex items-center">
                  <MessageCircle className="mr-2 h-5 w-5 text-primary" />
                  {t('dashboard.discussion.title', 'Discussion Updates')}
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <TransitionLink href="/dashboard/discussions">
                    {t('common.seeAll', 'See all')}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </TransitionLink>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sidebarLoading ? (
                <div className="text-center py-6 text-muted-foreground">
                  {t('dashboard.loading', 'Loading dashboard...')}
                </div>
              ) : discussionUpdates.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  {t('dashboard.discussion.none', 'No discussion updates yet')}
                </div>
              ) : (
                <div className="space-y-4">
                  {discussionUpdates.map((discussion) => (
                    <div key={discussion.id} className="p-4 rounded-lg border bg-card/50">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold line-clamp-1">{discussion.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {discussion.latestReply}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-between items-center gap-2 mt-3">
                        <div className="text-sm text-muted-foreground">
                          {discussion.replies} {t('dashboard.discussion.replies', 'replies')}
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <TransitionLink href={`/community/discussion/${discussion.id}`}>{t('dashboard.discussion.viewThread', 'View Thread')}</TransitionLink>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 width on desktop */}
        <div className="space-y-4 md:space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col items-center text-center">
                  <BookOpen className="h-8 w-8 text-primary mb-2" />
                  <h3 className="text-2xl sm:text-3xl font-bold">{stats.coursesInProgress}</h3>
                  <p className="text-sm text-muted-foreground">{t('dashboard.coursesInProgress', 'Courses in Progress')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col items-center text-center">
                  <Award className="h-8 w-8 text-primary mb-2" />
                  <h3 className="text-2xl sm:text-3xl font-bold">{stats.certificatesEarned}</h3>
                  <p className="text-sm text-muted-foreground">{t('dashboard.certificatesEarned', 'Certificates Earned')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col items-center text-center">
                  <BarChart3 className="h-8 w-8 text-primary mb-2" />
                  <h3 className="text-2xl sm:text-3xl font-bold">{stats.learningHours}h</h3>
                  <p className="text-sm text-muted-foreground">{t('dashboard.learningTime', 'Learning Time')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col items-center text-center">
                  <MessageCircle className="h-8 w-8 text-primary mb-2" />
                  <h3 className="text-2xl sm:text-3xl font-bold">{stats.forumPosts}</h3>
                  <p className="text-sm text-muted-foreground">{t('dashboard.forumPosts', 'Forum Posts')}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-primary" />
                {t('dashboard.upcomingEvents', 'Upcoming Events')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sidebarLoading ? (
                <div className="text-center py-6 text-muted-foreground">
                  {t('dashboard.loading', 'Loading dashboard...')}
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  {t('dashboard.events.none', 'No upcoming events right now')}
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => {
                    const eventDate = new Date(event.date)
                    return (
                      <div key={event.id} className="p-3 sm:p-4 rounded-lg border bg-card/50">
                        <h3 className="font-semibold">{event.title}</h3>
                        <div className="flex items-center mt-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>
                            {eventDate.toLocaleDateString(locale)} {t('common.at', 'at')} {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center mt-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{event.duration}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Community */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                {t('nav.community', 'Community')}
              </CardTitle>
              <CardDescription>{t('dashboard.community.description', 'Connect with peers and mentors')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <TransitionLink href="/community">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {t('dashboard.community.joinDiscussions', 'Join Discussions')}
                  </TransitionLink>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <TransitionLink href="/mentors">
                    <Users className="mr-2 h-4 w-4" />
                    {t('dashboard.community.findMentor', 'Find a Mentor')}
                  </TransitionLink>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <TransitionLink href="/community/events">
                    <Calendar className="mr-2 h-4 w-4" />
                    {t('dashboard.upcomingEvents', 'Upcoming Events')}
                  </TransitionLink>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
