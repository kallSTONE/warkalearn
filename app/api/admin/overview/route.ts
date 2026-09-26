import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type MonthBucket = {
  key: string
  label: string
}

type DashboardStat = {
  label: string
  value: string
  change: string
  icon: string
}

type TrendPoint = {
  month: string
  students: number
  enrollments: number
}

type DistributionPoint = {
  name: string
  value: number
}

type RecentActivity = {
  id: string
  action: string
  detail: string
  time: string
}

type StudentCourse = {
  courseId: number
  title: string
  slug: string
  enrolledAt: string | null
  completed: boolean
  completedAt: string | null
  progressPercentage: number | null
}

type StudentRow = {
  id: string
  number: number
  name: string
  email: string
  enrolledCourses: number
  completedCourses: number
  courses: StudentCourse[]
}

type RevenuePoint = {
  month: string
  revenue: number
  enrollments: number
}

type GrowthPoint = {
  month: string
  students: number
  mentors: number
}

type CoursePerformance = {
  name: string
  completion: number
  rating: number
  enrollments: number
}

type OverviewResponse = {
  dashboard: {
    stats: DashboardStat[]
    enrollmentTrend: TrendPoint[]
    courseDistribution: DistributionPoint[]
    recentActivity: RecentActivity[]
  }
  students: {
    stats: {
      totalStudents: number
      totalEnrollments: number
      totalCompletions: number
      completionRate: number
    }
    students: StudentRow[]
  }
  analytics: {
    stats: DashboardStat[]
    revenueByMonth: RevenuePoint[]
    userGrowth: GrowthPoint[]
    coursePerformance: CoursePerformance[]
    memberRoles: DistributionPoint[]
    paymentStatusDistribution: DistributionPoint[]
  }
}

type ProfileRow = {
  id: string
  full_name: string | null
  role: string | null
  created_at: string | null
}

type CourseRow = {
  id: number
  title: string
  slug: string
  category: string | null
  created_at: string | null
  published: boolean | null
  is_paid: boolean | null
  price: number | null
  status: string | null
  rating: number | null
}

type EnrollmentRow = {
  amount_paid: number
  id: string
  user_id: string
  course_id: number
  enrolled_at: string | null
  progress_id: string | null
}

type ProgressRow = {
  id: string
  enrollment_id: string
  completed: boolean | null
  completed_at: string | null
  progress_percentage: number | null
}

type OrderRow = {
  id: string
  total_amount: number
  status: string
  created_at: string
}

type TopicRow = {
  id: string
  created_at: string | null
}

type CertificateRow = {
  id: string
  created_at: string
  course_id: number
}

type LiveClassRegistrationRow = {
  id: string
  live_class_id: string
  amount_paid: number
  payment_status: string
  registration_status: string
  created_at: string
}

type FormatableDate = string | null | undefined

const MONTH_COUNT = 6
const PAID_STATUSES = new Set(['paid', 'completed', 'success'])

const getRecentMonths = (count: number): MonthBucket[] => {
  const now = new Date()
  return Array.from({ length: count }, (_, idx) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - idx), 1)
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleString('en-US', { month: 'short' }),
    }
  })
}

const formatPercentChange = (current: number, previous: number) => {
  if (previous <= 0) {
    return current > 0 ? '+100%' : '0%'
  }

  const delta = Math.round(((current - previous) / previous) * 100)
  return `${delta > 0 ? '+' : ''}${delta}%`
}

const formatRelativeTime = (isoDate: FormatableDate) => {
  if (!isoDate) return 'Unknown'
  const then = new Date(isoDate).getTime()
  const now = Date.now()
  const diffMs = Math.max(0, now - then)

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

const getMonthKey = (isoDate: FormatableDate, fallback = '') => {
  if (!isoDate) return fallback
  const date = new Date(isoDate)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const isPublishedCourse = (course: CourseRow) => {
  if (course.published === true) return true
  return typeof course.status === 'string' && course.status.toLowerCase() === 'published'
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const buildPercentDistribution = (counts: Record<string, number>) => {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  if (total <= 0) {
    return [{ name: 'No data', value: 100 }]
  }

  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
    }))
    .filter((entry) => entry.value > 0)
}

export async function GET(request: Request) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) {
    return authResult.response
  }

  try {
    const admin = getSupabaseAdminClient()
    const monthBuckets = getRecentMonths(MONTH_COUNT)
    const currentMonthKey = monthBuckets[monthBuckets.length - 1]?.key ?? ''
    const previousMonthKey = monthBuckets[monthBuckets.length - 2]?.key ?? ''

    const [profilesResult, coursesResult, enrollmentsResult, progressResult, ordersResult, topicsResult, certificatesResult, liveRegistrationsResult] =
      await Promise.all([
        admin.from('profiles').select('id, full_name, role, created_at').returns<ProfileRow[]>(),
        admin
          .from('courses')
          .select('id, title, slug, category, created_at, published, is_paid, price, status, rating')
          .returns<CourseRow[]>(),
        admin
          .from('course_enrollments')
          .select('id, user_id, course_id, enrolled_at, progress_id, amount_paid')
          .returns<EnrollmentRow[]>(),
        admin
          .from('course_progress')
          .select('id, enrollment_id, completed, completed_at, progress_percentage')
          .returns<ProgressRow[]>(),
        admin.from('shop_orders').select('id, total_amount, status, created_at').returns<OrderRow[]>(),
        admin.from('forum_topics').select('id, created_at').returns<TopicRow[]>(),
        admin.from('certificates').select('id, created_at, course_id').returns<CertificateRow[]>(),
        admin
          .from('live_class_registrations')
          .select('id, live_class_id, amount_paid, payment_status, registration_status, created_at')
          .returns<LiveClassRegistrationRow[]>(),
      ])

    const queryErrors = [
      profilesResult.error,
      coursesResult.error,
      enrollmentsResult.error,
      progressResult.error,
      ordersResult.error,
      topicsResult.error,
      certificatesResult.error,
      liveRegistrationsResult.error,
    ].filter(Boolean)

    if (queryErrors.length > 0) {
      const firstError = queryErrors[0]
      console.error('Admin overview query error:', firstError)
      return NextResponse.json({ error: 'Unable to load admin overview.' }, { status: 500 })
    }

    const profiles = profilesResult.data ?? []
    const courses = coursesResult.data ?? []
    const enrollments = enrollmentsResult.data ?? []
    const progressRows = progressResult.data ?? []
    const orders = ordersResult.data ?? []
    const topics = topicsResult.data ?? []
    const certificates = certificatesResult.data ?? []
    const liveClassRegistrations = liveRegistrationsResult.data ?? []

    const courseById = new Map(courses.map((course) => [course.id, course]))
    const progressById = new Map(progressRows.map((progress) => [progress.id, progress]))
    const progressByEnrollmentId = new Map(progressRows.map((progress) => [progress.enrollment_id, progress]))

    const paidOrders = orders.filter((order) => {
      if (!order.status) return true
      return PAID_STATUSES.has(order.status.toLowerCase())
    })

    const paidLiveClassRegistrations = liveClassRegistrations.filter((registration) => {
      if (!registration.payment_status) return true
      return PAID_STATUSES.has(registration.payment_status.toLowerCase())
    })

    const monthTrendMap = new Map<string, TrendPoint>()
    const revenueTrendMap = new Map<string, RevenuePoint>()
    const growthTrendMap = new Map<string, GrowthPoint>()

    monthBuckets.forEach((month) => {
      monthTrendMap.set(month.key, { month: month.label, students: 0, enrollments: 0 })
      revenueTrendMap.set(month.key, { month: month.label, revenue: 0, enrollments: 0 })
      growthTrendMap.set(month.key, { month: month.label, students: 0, mentors: 0 })
    })

    profiles.forEach((profile) => {
      const monthKey = getMonthKey(profile.created_at)
      const bucket = monthTrendMap.get(monthKey)
      const growthBucket = growthTrendMap.get(monthKey)

      if (bucket && profile.role?.toLowerCase() === 'lawyer') {
        bucket.students += 1
      }

      if (growthBucket) {
        if (profile.role?.toLowerCase() === 'lawyer') {
          growthBucket.students += 1
        }
        if (profile.role?.toLowerCase() === 'mentor') {
          growthBucket.mentors += 1
        }
      }
    })

    enrollments.forEach((enrollment) => {
      const monthKey = getMonthKey(enrollment.enrolled_at)
      const trendBucket = monthTrendMap.get(monthKey)
      const revenueBucket = revenueTrendMap.get(monthKey)

      if (trendBucket) {
        trendBucket.enrollments += 1
      }

      if (revenueBucket) {
        revenueBucket.enrollments += 1
      }
    })

    const paidCourseEnrollments = enrollments.filter((enrollment) => {
      const course = courseById.get(enrollment.course_id)
      return course?.is_paid === true
    })

    const getEnrollmentRevenueAmount = (enrollment: EnrollmentRow) => {
      const coursePrice = courseById.get(enrollment.course_id)?.price ?? 0
      return Number(enrollment.amount_paid ?? coursePrice)
    }

    paidOrders.forEach((order) => {
      const monthKey = getMonthKey(order.created_at)
      const revenueBucket = revenueTrendMap.get(monthKey)

      if (revenueBucket) {
        revenueBucket.revenue += Number(order.total_amount || 0)
      }
    })

    paidCourseEnrollments.forEach((enrollment) => {
      const monthKey = getMonthKey(enrollment.enrolled_at)
      const revenueBucket = revenueTrendMap.get(monthKey)
      const coursePrice = getEnrollmentRevenueAmount(enrollment)

      if (revenueBucket) {
        revenueBucket.revenue += coursePrice
      }
    })

    paidLiveClassRegistrations.forEach((registration) => {
      const monthKey = getMonthKey(registration.created_at)
      const revenueBucket = revenueTrendMap.get(monthKey)

      if (revenueBucket) {
        revenueBucket.revenue += Number(registration.amount_paid || 0)
      }
    })

    const totalStudents = profiles.filter((profile) => profile.role?.toLowerCase() === 'lawyer').length
    const activeCourses = courses.filter(isPublishedCourse).length
    const shopRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
    const courseRevenue = paidCourseEnrollments.reduce(
      (sum, enrollment) => sum + getEnrollmentRevenueAmount(enrollment),
      0
    )
    const liveClassRevenue = paidLiveClassRegistrations.reduce((sum, registration) => sum + Number(registration.amount_paid || 0), 0)

    const studentsThisMonth = profiles.filter(
      (profile) => profile.role?.toLowerCase() === 'lawyer' && getMonthKey(profile.created_at) === currentMonthKey
    ).length
    const studentsPrevMonth = profiles.filter(
      (profile) => profile.role?.toLowerCase() === 'lawyer' && getMonthKey(profile.created_at) === previousMonthKey
    ).length

    const activeCoursesThisMonth = courses.filter(
      (course) => isPublishedCourse(course) && getMonthKey(course.created_at) === currentMonthKey
    ).length
    const activeCoursesPrevMonth = courses.filter(
      (course) => isPublishedCourse(course) && getMonthKey(course.created_at) === previousMonthKey
    ).length

    const shopRevenueThisMonth = paidOrders
      .filter((order) => getMonthKey(order.created_at) === currentMonthKey)
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
    const shopRevenuePrevMonth = paidOrders
      .filter((order) => getMonthKey(order.created_at) === previousMonthKey)
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0)

    const courseRevenueThisMonth = paidCourseEnrollments
      .filter((enrollment) => getMonthKey(enrollment.enrolled_at) === currentMonthKey)
      .reduce((sum, enrollment) => sum + getEnrollmentRevenueAmount(enrollment), 0)
    const courseRevenuePrevMonth = paidCourseEnrollments
      .filter((enrollment) => getMonthKey(enrollment.enrolled_at) === previousMonthKey)
      .reduce((sum, enrollment) => sum + getEnrollmentRevenueAmount(enrollment), 0)

    const liveClassRevenueThisMonth = paidLiveClassRegistrations
      .filter((registration) => getMonthKey(registration.created_at) === currentMonthKey)
      .reduce((sum, registration) => sum + Number(registration.amount_paid || 0), 0)
    const liveClassRevenuePrevMonth = paidLiveClassRegistrations
      .filter((registration) => getMonthKey(registration.created_at) === previousMonthKey)
      .reduce((sum, registration) => sum + Number(registration.amount_paid || 0), 0)

    const totalEnrollments = enrollments.length
    const totalCompletions = enrollments.filter((enrollment) => {
      const progress = progressById.get(enrollment.progress_id ?? '') ?? progressByEnrollmentId.get(enrollment.id)
      return progress?.completed === true || (typeof progress?.progress_percentage === 'number' && progress.progress_percentage >= 100)
    }).length
    const completionRate = totalEnrollments > 0 ? Math.round((totalCompletions / totalEnrollments) * 100) : 0

    const enrollmentsThisMonth = enrollments.filter((enrollment) => getMonthKey(enrollment.enrolled_at) === currentMonthKey).length
    const enrollmentsPrevMonth = enrollments.filter((enrollment) => getMonthKey(enrollment.enrolled_at) === previousMonthKey).length

    const completionsThisMonth = enrollments.filter((enrollment) => {
      const progress = progressById.get(enrollment.progress_id ?? '') ?? progressByEnrollmentId.get(enrollment.id)
      const completed = progress?.completed === true || (typeof progress?.progress_percentage === 'number' && progress.progress_percentage >= 100)
      return completed && getMonthKey(progress?.completed_at ?? enrollment.enrolled_at) === currentMonthKey
    }).length
    const completionsPrevMonth = enrollments.filter((enrollment) => {
      const progress = progressById.get(enrollment.progress_id ?? '') ?? progressByEnrollmentId.get(enrollment.id)
      const completed = progress?.completed === true || (typeof progress?.progress_percentage === 'number' && progress.progress_percentage >= 100)
      return completed && getMonthKey(progress?.completed_at ?? enrollment.enrolled_at) === previousMonthKey
    }).length

    const dashboardRecentPool: Array<{ id: string; action: string; detail: string; at: string | null }> = []

    enrollments
      .slice()
      .sort((a, b) => new Date(b.enrolled_at ?? 0).getTime() - new Date(a.enrolled_at ?? 0).getTime())
      .slice(0, 5)
      .forEach((enrollment) => {
        dashboardRecentPool.push({
          id: `enrollment-${enrollment.id}`,
          action: 'New enrollment',
          detail: courseById.get(enrollment.course_id)?.title || 'Course',
          at: enrollment.enrolled_at,
        })
      })

    certificates
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .forEach((certificate) => {
        dashboardRecentPool.push({
          id: `certificate-${certificate.id}`,
          action: 'Certificate issued',
          detail: courseById.get(certificate.course_id)?.title || 'Course',
          at: certificate.created_at,
        })
      })

    orders
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .forEach((order) => {
        dashboardRecentPool.push({
          id: `order-${order.id}`,
          action: 'Shop order',
          detail: `ETB ${Number(order.total_amount || 0).toLocaleString()} (${order.status || 'unknown'})`,
          at: order.created_at,
        })
      })

    paidLiveClassRegistrations
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .forEach((registration) => {
        dashboardRecentPool.push({
          id: `live-registration-${registration.id}`,
          action: 'Live class reservation',
          detail: `ETB ${Number(registration.amount_paid || 0).toLocaleString()}`,
          at: registration.created_at,
        })
      })

    const recentActivity = dashboardRecentPool
      .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        action: item.action,
        detail: item.detail,
        time: formatRelativeTime(item.at),
      }))

    const categoryCounts: Record<string, number> = {}
    courses.forEach((course) => {
      const category = (course.category || 'Other').trim() || 'Other'
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    })

    const courseDistribution = buildPercentDistribution(categoryCounts)

    const studentProfileRows = profiles
      .filter((profile) => profile.role?.toLowerCase() === 'lawyer')
      .slice()
      .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())

    const enrollmentsByUser = new Map<string, EnrollmentRow[]>()
    enrollments.forEach((enrollment) => {
      const bucket = enrollmentsByUser.get(enrollment.user_id) ?? []
      bucket.push(enrollment)
      enrollmentsByUser.set(enrollment.user_id, bucket)
    })

    const studentIds = studentProfileRows.map((profile) => profile.id)
    const courseNamesByStudent = new Map<string, StudentCourse[]>()

    studentIds.forEach((studentId) => {
      const studentEnrollments = (enrollmentsByUser.get(studentId) ?? [])
        .slice()
        .sort((a, b) => new Date(b.enrolled_at ?? 0).getTime() - new Date(a.enrolled_at ?? 0).getTime())

      const courseProgress = studentEnrollments.map((enrollment) => {
        const progress = progressById.get(enrollment.progress_id ?? '') ?? progressByEnrollmentId.get(enrollment.id)
        const completed = progress?.completed === true || (typeof progress?.progress_percentage === 'number' && progress.progress_percentage >= 100)
        const course = courseById.get(enrollment.course_id)

        return {
          courseId: enrollment.course_id,
          title: course?.title || 'Course',
          slug: course?.slug || '',
          enrolledAt: enrollment.enrolled_at,
          completed,
          completedAt: progress?.completed_at ?? null,
          progressPercentage: progress?.progress_percentage ?? null,
        }
      })

      courseNamesByStudent.set(studentId, courseProgress)
    })

    const studentRows: StudentRow[] = studentProfileRows.map((profile, index) => {
      const coursesForStudent = courseNamesByStudent.get(profile.id) ?? []
      const completedCourses = coursesForStudent.filter((course) => course.completed).length

      return {
        id: profile.id,
        number: index + 1,
        name: profile.full_name?.trim() || `Student ${index + 1}`,
        email: 'Not available',
        enrolledCourses: coursesForStudent.length,
        completedCourses,
        courses: coursesForStudent,
      }
    })

    const coursePerformance: CoursePerformance[] = courses
      .map((course) => {
        const courseEnrollments = enrollments.filter((enrollment) => enrollment.course_id === course.id)
        const completedForCourse = courseEnrollments.filter((enrollment) => {
          const progress = progressById.get(enrollment.progress_id ?? '') ?? progressByEnrollmentId.get(enrollment.id)
          return progress?.completed === true || (typeof progress?.progress_percentage === 'number' && progress.progress_percentage >= 100)
        }).length

        return {
          name: course.title,
          completion: courseEnrollments.length > 0 ? Math.round((completedForCourse / courseEnrollments.length) * 100) : 0,
          rating: typeof course.rating === 'number' ? Number(course.rating.toFixed(1)) : 0,
          enrollments: courseEnrollments.length,
        }
      })
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 5)

    const memberRoleCounts: Record<string, number> = {}
    profiles.forEach((profile) => {
      const role = (profile.role || 'unknown').toLowerCase()
      if (role === 'admin') {
        return
      }

      const displayRole = role === 'lawyer' ? 'Students' : capitalize(role)
      memberRoleCounts[displayRole] = (memberRoleCounts[displayRole] || 0) + 1
    })

    const paymentStatusCounts: Record<string, number> = {}
    orders.forEach((order) => {
      const status = (order.status || 'unknown').toLowerCase()
      const displayStatus = status === 'paid' ? 'Paid' : capitalize(status)
      paymentStatusCounts[displayStatus] = (paymentStatusCounts[displayStatus] || 0) + 1
    })

    const analyticsStats: DashboardStat[] = [
      {
        label: 'Shop Revenue',
        value: `ETB ${Math.round(shopRevenue).toLocaleString()}`,
        change: formatPercentChange(shopRevenueThisMonth, shopRevenuePrevMonth),
        icon: '🛍️',
      },
      {
        label: 'Course Revenue',
        value: `ETB ${Math.round(courseRevenue).toLocaleString()}`,
        change: formatPercentChange(courseRevenueThisMonth, courseRevenuePrevMonth),
        icon: '💰',
      },
      {
        label: 'Live Class Revenue',
        value: `ETB ${Math.round(liveClassRevenue).toLocaleString()}`,
        change: formatPercentChange(liveClassRevenueThisMonth, liveClassRevenuePrevMonth),
        icon: '🎥',
      },
      {
        label: 'Total Users',
        value: profiles.filter((profile) => profile.role?.toLowerCase() !== 'admin').length.toLocaleString(),
        change: formatPercentChange(
          profiles.filter((profile) => profile.role?.toLowerCase() !== 'admin' && getMonthKey(profile.created_at) === currentMonthKey).length,
          profiles.filter((profile) => profile.role?.toLowerCase() !== 'admin' && getMonthKey(profile.created_at) === previousMonthKey).length
        ),
        icon: '👥',
      },
      {
        label: 'Total Enrollments',
        value: totalEnrollments.toLocaleString(),
        change: formatPercentChange(enrollmentsThisMonth, enrollmentsPrevMonth),
        icon: '📚',
      },
      {
        label: 'Completion Rate',
        value: `${completionRate}%`,
        change: formatPercentChange(completionsThisMonth, completionsPrevMonth),
        icon: '✅',
      },
    ]

    const dashboardStats: DashboardStat[] = [
      {
        label: 'Total Students',
        value: totalStudents.toLocaleString(),
        change: formatPercentChange(studentsThisMonth, studentsPrevMonth),
        icon: '👥',
      },
      {
        label: 'Active Courses',
        value: activeCourses.toLocaleString(),
        change: formatPercentChange(activeCoursesThisMonth, activeCoursesPrevMonth),
        icon: '📚',
      },
      {
        label: 'Live Class Revenue',
        value: `ETB ${Math.round(liveClassRevenue).toLocaleString()}`,
        change: formatPercentChange(liveClassRevenueThisMonth, liveClassRevenuePrevMonth),
        icon: '🎥',
      },
      {
        label: 'Shop Revenue',
        value: `ETB ${Math.round(shopRevenue).toLocaleString()}`,
        change: formatPercentChange(shopRevenueThisMonth, shopRevenuePrevMonth),
        icon: '🛍️',
      },
      {
        label: 'Course Revenue',
        value: `ETB ${Math.round(courseRevenue).toLocaleString()}`,
        change: formatPercentChange(courseRevenueThisMonth, courseRevenuePrevMonth),
        icon: '💰',
      },
    ]

    const response: OverviewResponse = {
      dashboard: {
        stats: dashboardStats,
        enrollmentTrend: monthBuckets.map((month) => monthTrendMap.get(month.key)!),
        courseDistribution,
        recentActivity,
      },
      students: {
        stats: {
          totalStudents,
          totalEnrollments,
          totalCompletions,
          completionRate,
        },
        students: studentRows,
      },
      analytics: {
        stats: analyticsStats,
        revenueByMonth: monthBuckets.map((month) => revenueTrendMap.get(month.key)!),
        userGrowth: monthBuckets.map((month) => growthTrendMap.get(month.key)!),
        coursePerformance,
        memberRoles: buildPercentDistribution(memberRoleCounts),
        paymentStatusDistribution: buildPercentDistribution(paymentStatusCounts),
      },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    console.error('Admin overview API error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Unable to load admin overview.' },
      { status: 500 }
    )
  }
}
