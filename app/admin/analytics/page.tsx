"use client"

import { useEffect, useState } from "react"
import TransitionLink from "@/components/transition-link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Calendar, Handshake } from "lucide-react"

type StatCard = {
  label: string
  value: string
  change: string
  icon: string
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

type DistributionPoint = {
  name: string
  value: number
}

type AdminAnalytics = {
  stats: StatCard[]
  revenueByMonth: RevenuePoint[]
  userGrowth: GrowthPoint[]
  coursePerformance: CoursePerformance[]
  memberRoles: DistributionPoint[]
  paymentStatusDistribution: DistributionPoint[]
}

type AdminOverviewResponse = {
  analytics: AdminAnalytics
}

const EMPTY_ANALYTICS: AdminAnalytics = {
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
  memberRoles: [],
  paymentStatusDistribution: [],
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
const AXIS_TICK_STYLE = { fill: "hsl(var(--foreground))" }

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AdminAnalytics>(EMPTY_ANALYTICS)

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
          throw new Error(String(payload?.error ?? "Unable to load analytics."))
        }

        const overview = payload as AdminOverviewResponse
        setAnalyticsData(overview.analytics ?? EMPTY_ANALYTICS)
      } catch (error) {
        console.error("Analytics load failed", error)
        setAnalyticsData(EMPTY_ANALYTICS)
      }
    }

    void load()
  }, [])

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-2">Comprehensive platform insights and metrics</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
          <Button variant="outline" className="gap-2 bg-transparent w-full sm:w-auto shadow-sm" asChild>
            <TransitionLink href="/admin/analytics/affiliates">
              <Handshake size={20} />
              Affiliate Analytics
            </TransitionLink>
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent w-full sm:w-auto shadow-sm">
            <Calendar size={20} />
            Last 30 Days
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-3 lg:gap-4">
        {analyticsData.stats.map((stat, index) => (
          <Card key={index} className="bg-card shadow-sm">
            <CardContent className="pt-3 pb-3 md:pt-4 md:pb-4 px-4">
              <div>
                <p className="text-muted-foreground text-xs md:text-sm">{stat.label}</p>
                <p className="text-xl md:text-2xl font-bold text-foreground mt-1.5">{stat.value}</p>
                <p className="text-[11px] md:text-xs text-emerald-600 mt-1.5">{stat.change} from last month</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-5">
        {/* Revenue vs Enrollments */}
        <Card className="bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Revenue vs Enrollments</CardTitle>
            <CardDescription>Monthly revenue and enrollment activity</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[190px] md:h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis stroke="hsl(var(--foreground))" tick={AXIS_TICK_STYLE} minTickGap={24} />
                  <YAxis stroke="hsl(var(--foreground))" tick={AXIS_TICK_STYLE} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="enrollments" name="Enrollments" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card className="bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">User Growth</CardTitle>
            <CardDescription>Students and mentors over time</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[190px] md:h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis stroke="hsl(var(--foreground))" tick={AXIS_TICK_STYLE} minTickGap={24} />
                  <YAxis stroke="hsl(var(--foreground))" tick={AXIS_TICK_STYLE} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="students" stackId="1" fill="#3b82f6" stroke="#3b82f6" />
                  <Area type="monotone" dataKey="mentors" stackId="1" fill="#10b981" stroke="#10b981" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Member Roles */}
        <Card className="bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Member Roles</CardTitle>
            <CardDescription>User distribution by role</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[190px] md:h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ left: 18, right: 18, top: 6, bottom: 6 }}>
                  <Pie
                    data={analyticsData.memberRoles}
                    cx="55%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value}%`}
                    outerRadius={66}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.memberRoles.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card className="bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Payment Status</CardTitle>
            <CardDescription>Order distribution by payment status</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[190px] md:h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ left: 18, right: 18, top: 6, bottom: 6 }}>
                  <Pie
                    data={analyticsData.paymentStatusDistribution}
                    cx="55%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value}%`}
                    outerRadius={66}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.paymentStatusDistribution.map((entry, index) => (
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

      {/* Course Performance */}
      <Card className="bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Course Performance</CardTitle>
          <CardDescription>Completion rates and rating scores</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {analyticsData.coursePerformance.map((course, index) => (
              <div key={index} className="space-y-2 rounded-2xl border border-border/70 p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{course.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {course.completion}% • {course.rating} ⭐
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Completion</p>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${course.completion}%` }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Rating</p>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${(course.rating / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
