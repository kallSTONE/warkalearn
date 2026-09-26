"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"
import { supabase } from "@/lib/supabase"
import { Activity, DollarSign, LayoutDashboard, Users } from "lucide-react"

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

type DashboardData = {
  stats: DashboardStat[]
  enrollmentTrend: TrendPoint[]
  courseDistribution: DistributionPoint[]
  recentActivity: RecentActivity[]
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
  dashboard: DashboardData
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

const getRecentMonths = (count: number): { key: string; label: string }[] => {
  const now = new Date()
  return Array.from({ length: count }, (_, idx) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - idx), 1)
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleString("en-US", { month: "short" }),
    }
  })
}

const EMPTY_DASHBOARD: DashboardData = {
  stats: [
    { label: "Total Students", value: "0", change: "0%", icon: "👥" },
    { label: "Active Courses", value: "0", change: "0%", icon: "📚" },
    { label: "Live Class Revenue", value: "ETB 0", change: "0%", icon: "🎥" },
    { label: "Shop Revenue", value: "ETB 0", change: "0%", icon: "🛍️" },
    { label: "Course Revenue", value: "ETB 0", change: "0%", icon: "💰" },
  ],
  enrollmentTrend: getRecentMonths(6).map((month) => ({ month: month.label, students: 0, enrollments: 0 })),
  courseDistribution: [{ name: "No Data", value: 100 }],
  recentActivity: [],
}

const EMPTY_OVERVIEW: OverviewResponse = {
  dashboard: EMPTY_DASHBOARD,
  students: {
    stats: {
      totalStudents: 0,
      totalEnrollments: 0,
      totalCompletions: 0,
      completionRate: 0,
    },
    students: [],
  },
  analytics: {
    stats: [
      { label: "Shop Revenue", value: "ETB 0", change: "0%", icon: "🛍️" },
      { label: "Course Revenue", value: "ETB 0", change: "0%", icon: "💰" },
      { label: "Live Class Revenue", value: "ETB 0", change: "0%", icon: "🎥" },
      { label: "Total Users", value: "0", change: "0%", icon: "👥" },
      { label: "Total Enrollments", value: "0", change: "0%", icon: "📚" },
      { label: "Completion Rate", value: "0%", change: "0%", icon: "✅" },
    ],
    revenueByMonth: [],
    userGrowth: [],
    coursePerformance: [],
    memberRoles: [{ name: "No Data", value: 100 }],
    paymentStatusDistribution: [{ name: "No Data", value: 100 }],
  },
}

const formatPercentChange = (current: number, previous: number) => {
  if (previous <= 0) {
    return current > 0 ? "+100%" : "0%"
  }
  const delta = Math.round(((current - previous) / previous) * 100)
  return `${delta > 0 ? "+" : ""}${delta}%`
}

const formatRelativeTime = (isoDate: string | null) => {
  if (!isoDate) return "Unknown"
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

const getMonthKey = (isoDate: string | null, fallback = "") => {
  if (!isoDate) return fallback
  const date = new Date(isoDate)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"]
const AXIS_TICK_STYLE = { fill: "hsl(var(--foreground))" }

const getSectionSummary = (section: string, overview: OverviewResponse) => {
  switch (section) {
    case "revenue":
      return overview.analytics.stats[0]?.value ?? "ETB 0"
    case "students":
      return overview.students.stats.totalStudents.toLocaleString()
    case "activity":
      return overview.dashboard.recentActivity.length.toString()
    default:
      return overview.dashboard.stats[0]?.value ?? "0"
  }
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewResponse>(EMPTY_OVERVIEW)
  const [activeSection, setActiveSection] = useState("overview")

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const accessToken = session?.access_token
        if (!accessToken) {
          throw new Error("Missing session token.")
        }

        const response = await fetch("/api/admin/overview", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        })

        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(String(payload?.error ?? "Unable to load dashboard."))
        }

        setOverview((payload as OverviewResponse) ?? EMPTY_OVERVIEW)
      } catch (err) {
        console.error("Dashboard load failed", err)
        setOverview(EMPTY_OVERVIEW)
      }
    }
    load()
  }, [])

  const topStudents = useMemo(() => overview.students.students.slice(0, 5), [overview.students.students])

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-muted/60 p-1 md:grid-cols-4">
          <TabsTrigger
            value="overview"
            className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <LayoutDashboard size={16} />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="revenue"
            className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <DollarSign size={16} />
            <span>Revenue</span>
          </TabsTrigger>
          <TabsTrigger
            value="students"
            className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Users size={16} />
            <span>Students</span>
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Activity size={16} />
            <span>Activity</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
            {overview.dashboard.stats.map((stat, index) => (
              <Card key={index} className="bg-card border-border/80 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                    <span className="text-xl md:text-2xl">{stat.icon}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-xs text-emerald-600 mt-2">{stat.change} from last month</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <Card className="lg:col-span-2 bg-card border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle>Enrollment Trend</CardTitle>
                <CardDescription>Student and course growth over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] md:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overview.dashboard.enrollmentTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" stroke="hsl(var(--foreground))" tick={AXIS_TICK_STYLE} minTickGap={24} />
                      <YAxis stroke="hsl(var(--foreground))" tick={AXIS_TICK_STYLE} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="students" name="Students" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: "#3b82f6" }} />
                      <Line type="monotone" dataKey="enrollments" name="Enrollments" stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle>Course Distribution</CardTitle>
                <CardDescription>By category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] md:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overview.dashboard.courseDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name} ${value}%`}
                        outerRadius={86}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {overview.dashboard.courseDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 md:gap-6">
            {overview.analytics.stats.map((stat, index) => (
              <Card key={index} className="bg-card border-border/80 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                    <span className="text-xl md:text-2xl">{stat.icon}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-xs text-emerald-600 mt-2">{stat.change} from last month</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <Card className="lg:col-span-2 bg-card border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle>Revenue by Month</CardTitle>
                <CardDescription>Monthly revenue and enrollments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] md:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.analytics.revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" stroke="hsl(var(--foreground))" tick={AXIS_TICK_STYLE} minTickGap={24} />
                      <YAxis stroke="hsl(var(--foreground))" tick={AXIS_TICK_STYLE} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[10, 10, 0, 0]} />
                      <Bar dataKey="enrollments" name="Enrollments" fill="#10b981" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle>Payment Status</CardTitle>
                <CardDescription>Order distribution by payment status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] md:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overview.analytics.paymentStatusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name} ${value}%`}
                        outerRadius={86}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {overview.analytics.paymentStatusDistribution.map((entry, index) => (
                          <Cell key={`payment-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Course Performance</CardTitle>
              <CardDescription>Completion rates and rating scores for top courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {overview.analytics.coursePerformance.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No course performance data yet.</p>
                ) : (
                  overview.analytics.coursePerformance.map((course, index) => (
                    <div key={index} className="space-y-2 rounded-2xl border border-border/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-foreground">{course.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {course.completion}% • {course.rating} ⭐
                        </span>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">Completion</p>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${course.completion}%` }} />
                          </div>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">Rating</p>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(course.rating / 5) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-6 mt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <Card className="bg-card border-border/80 shadow-sm">
              <CardContent className="pt-4 md:pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="mt-2 text-2xl md:text-3xl font-bold text-foreground">{overview.students.stats.totalStudents.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/80 shadow-sm">
              <CardContent className="pt-4 md:pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Total Enrollments</p>
                  <p className="mt-2 text-2xl md:text-3xl font-bold text-foreground">{overview.students.stats.totalEnrollments.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/80 shadow-sm">
              <CardContent className="pt-4 md:pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="mt-2 text-2xl md:text-3xl font-bold text-foreground">{overview.students.stats.totalCompletions.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/80 shadow-sm">
              <CardContent className="pt-4 md:pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="mt-2 text-2xl md:text-3xl font-bold text-foreground">{overview.students.stats.completionRate}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <Card className="lg:col-span-2 bg-card border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>Students and mentors over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] md:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overview.analytics.userGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" stroke="var(--text-muted)" minTickGap={24} />
                      <YAxis stroke="var(--text-muted)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="students" name="Students" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: "#3b82f6" }} />
                      <Line type="monotone" dataKey="mentors" name="Mentors" stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle>Top Students</CardTitle>
                <CardDescription>Most active learners by enrollment count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No student records yet.</p>
                  ) : (
                    topStudents.map((student) => (
                      <div key={student.id} className="rounded-2xl border border-border/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            #{student.number}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Courses</p>
                            <p className="font-semibold text-foreground">{student.enrolledCourses}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Completed</p>
                            <p className="font-semibold text-foreground">{student.completedCourses}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          <Card className="bg-card border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest platform activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview.dashboard.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity yet.</p>
                ) : overview.dashboard.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex flex-col gap-2 border-b border-border pb-4 last:border-0 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.detail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
