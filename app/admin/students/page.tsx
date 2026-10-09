"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Search, Plus, Mail, Edit2, Trash2 } from "lucide-react"

interface Student {
  id: string
  number: number
  name: string
  email: string
  enrolledCourses: number
  completedCourses: number
  courses: StudentCourse[]
}

interface StudentCourse {
  courseId: number
  title: string
  slug: string
  enrolledAt: string | null
  completed: boolean
  completedAt: string | null
  progressPercentage: number | null
}

interface StudentStats {
  totalStudents: number
  totalEnrollments: number
  totalCompletions: number
  completionRate: number
}

interface AdminOverviewResponse {
  students: {
    stats: StudentStats
    students: Student[]
  }
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [studentStats, setStudentStats] = useState<StudentStats>({
    totalStudents: 0,
    totalEnrollments: 0,
    totalCompletions: 0,
    completionRate: 0,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const itemsPerPage = 10

  useEffect(() => {
    const loadStudents = async () => {
      setIsLoading(true)
      setLoadError(null)

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
          throw new Error(String(payload?.error ?? "Unable to load students."))
        }

        const overview = payload as AdminOverviewResponse
        setStudents(overview.students?.students ?? [])
        setStudentStats(
          overview.students?.stats ?? {
            totalStudents: 0,
            totalEnrollments: 0,
            totalCompletions: 0,
            completionRate: 0,
          }
        )
      } catch (error: any) {
        console.error("Failed to load students:", error)
        setLoadError(error?.message ?? "Failed to load students.")
        setStudents([])
        setStudentStats({
          totalStudents: 0,
          totalEnrollments: 0,
          totalCompletions: 0,
          completionRate: 0,
        })
      } finally {
        setIsLoading(false)
      }
    }

    void loadStudents()
  }, [])

  const filteredStudents = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return students.filter((student) => {
      return (
        student.name.toLowerCase().includes(q) ||
        student.id.toLowerCase().includes(q)
      )
    })
  }, [students, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage))

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredStudents.slice(start, start + itemsPerPage)
  }, [filteredStudents, currentPage])

  const getVisiblePages = (page: number, pages: number) => {
    if (pages <= 3) return Array.from({ length: pages }, (_, index) => index + 1)
    if (page <= 2) return [1, 2, 3]
    if (page >= pages - 1) return [pages - 2, pages - 1, pages]
    return [page - 1, page, page + 1]
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    return (
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="px-3"
        >
          &lt;&lt;
        </Button>
        {getVisiblePages(currentPage, totalPages).map((page) => (
          <Button
            key={`student-page-${page}`}
            size="sm"
            variant={currentPage === page ? "default" : "outline"}
            onClick={() => setCurrentPage(page)}
            className="min-w-10 px-3"
          >
            {page}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="px-3"
        >
          &gt;&gt;
        </Button>
      </div>
    )
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleDelete = (id: string) => {
    setStudents(students.filter((student) => student.id !== id))
  }

  const totalEnrollments = studentStats.totalEnrollments
  const totalCompletions = studentStats.totalCompletions
  const completionRate = studentStats.completionRate

  const renderCourseBadges = (courses: StudentCourse[], completedOnly = false) => {
    const visibleCourses = courses.filter((course) => (completedOnly ? course.completed : true))
    const previewCourses = visibleCourses.slice(0, 3)

    return (
      <div className="flex flex-wrap gap-1">
        {previewCourses.map((course) => (
          <Badge key={`${course.courseId}-${course.slug || course.title}`} variant={course.completed ? "default" : "outline"} className="max-w-full truncate">
            {course.title}
          </Badge>
        ))}
        {visibleCourses.length > previewCourses.length ? (
          <Badge variant="secondary">+{visibleCourses.length - previewCourses.length} more</Badge>
        ) : null}
        {visibleCourses.length === 0 ? (
          <span className="text-xs text-muted-foreground">No courses</span>
        ) : null}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground mt-2">Manage student's accounts and enrollments</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto">
          <Plus size={20} />
          Add Student
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <Card className="bg-card">
          <CardContent className="pt-4 md:pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total Student count</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-2">{studentStats.totalStudents}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-4 md:pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total Enrollments</p>
              <p className="text-2xl md:text-3xl font-bold text-emerald-600 mt-2">{totalEnrollments}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-4 md:pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total Completions</p>
              <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-2">{totalCompletions}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-4 md:pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Completion Rate</p>
              <p className="text-2xl md:text-3xl font-bold text-orange-600 mt-2">{completionRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-card">
        <CardContent className="pt-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
            <Input
              placeholder="Search students by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <CardDescription>
            {isLoading ? "Loading students..." : `${filteredStudents.length} students found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadError ? <p className="text-sm text-destructive mb-4">{loadError}</p> : null}
          <div className="space-y-3 md:hidden">
            {filteredStudents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No students found.</div>
            ) : (
              paginatedStudents.map((student) => (
                <div key={student.id} className="rounded-lg border border-border p-3 space-y-3 bg-card shadow-sm">
                  <div>
                    <p className="font-medium text-foreground">
                      #{student.number} {student.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Mail size={14} />
                      {student.email}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Enrolled</p>
                      <p className="font-medium text-foreground">{student.enrolledCourses}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completed</p>
                      <p className="font-medium text-foreground">{student.completedCourses}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Enrolled Courses</p>
                      {renderCourseBadges(student.courses)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Completed Courses</p>
                      {renderCourseBadges(student.courses, true)}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm">
                      <Edit2 size={16} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(student.id)}
                    >
                      <Trash2 size={16} className="mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
            {renderPagination()}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">No.</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Enrolled</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Completed</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Courses</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Completed Courses</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((student) => (
                  <tr key={student.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-3 text-muted-foreground">{student.number}</td>
                    <td className="py-3 px-3 text-foreground font-medium">{student.name}</td>
                    <td className="py-3 px-3 text-muted-foreground flex items-center gap-2">
                      <Mail size={16} />
                      {student.email}
                    </td>
                    <td className="py-3 px-3 text-foreground">{student.enrolledCourses}</td>
                    <td className="py-3 px-3 text-foreground">{student.completedCourses}</td>
                    <td className="py-3 px-3 text-foreground">{renderCourseBadges(student.courses)}</td>
                    <td className="py-3 px-3 text-foreground">{renderCourseBadges(student.courses, true)}</td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(student.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </CardContent>
      </Card>
    </div>
  )
}
