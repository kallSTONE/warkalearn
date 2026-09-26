"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import TransitionLink from '@/components/transition-link'
import { Input } from "@/components/ui/input"
import { Search, Plus, Edit2, Trash2, Eye } from "lucide-react"
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { formatEthiopianBirr } from '@/lib/shop'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Course {
  id: number
  title: string
  slug?: string | null
  description?: string | null
  hero_image?: string | null
  category?: string | null
  level?: string | null
  is_paid?: boolean | null
  price?: number | null
  students?: number | null
  rating?: number | null
  created_at?: string | null
}

interface ProgramRow {
  id: string
  title: string
  slug: string
  status: string
  price: number | null
  updated_at?: string
  created_at?: string
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [programs, setPrograms] = useState<ProgramRow[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [programSearchTerm, setProgramSearchTerm] = useState("")
  const [currentCoursesPage, setCurrentCoursesPage] = useState(1)
  const [currentProgramsPage, setCurrentProgramsPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [programLoading, setProgramLoading] = useState(false)
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'courses' | 'programs'>(
    searchParams.get('tab') === 'programs' ? 'programs' : 'courses'
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [enteredCourseName, setEnteredCourseName] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [submittingDelete, setSubmittingDelete] = useState(false)
  const itemsPerPage = 10

  useEffect(() => {
    const loadCourses = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, slug, category, level, is_paid, price, students, rating, created_at')
        .order('created_at', { ascending: false })

      setLoading(false)
      if (error) {
        toast({ title: 'Error', description: error.message })
        return
      }
      setCourses(data || [])
    }

    loadCourses()
  }, [])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'programs' || tab === 'courses') {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    const loadPrograms = async () => {
      setProgramLoading(true)
      const { data, error } = await supabase
        .from('programs')
        .select('id, title, slug, status, price, updated_at, created_at')
        .order('created_at', { ascending: false })

      setProgramLoading(false)
      if (error) {
        toast({ title: 'Error', description: error.message })
        return
      }
      setPrograms(data || [])
    }

    loadPrograms()
  }, [])

  const filteredCourses = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return courses.filter((course) => {
      return (
        (course.title || '').toLowerCase().includes(q) ||
        (course.category || '').toLowerCase().includes(q) ||
        (course.level || '').toLowerCase().includes(q)
      )
    })
  }, [courses, searchTerm])

  const filteredPrograms = useMemo(() => {
    const q = programSearchTerm.toLowerCase()
    return programs.filter((program) => {
      return (
        (program.title || '').toLowerCase().includes(q) ||
        (program.slug || '').toLowerCase().includes(q) ||
        (program.status || '').toLowerCase().includes(q)
      )
    })
  }, [programs, programSearchTerm])

  const coursesTotalPages = Math.max(1, Math.ceil(filteredCourses.length / itemsPerPage))
  const programsTotalPages = Math.max(1, Math.ceil(filteredPrograms.length / itemsPerPage))

  const paginatedCourses = useMemo(() => {
    const start = (currentCoursesPage - 1) * itemsPerPage
    return filteredCourses.slice(start, start + itemsPerPage)
  }, [filteredCourses, currentCoursesPage])

  const paginatedPrograms = useMemo(() => {
    const start = (currentProgramsPage - 1) * itemsPerPage
    return filteredPrograms.slice(start, start + itemsPerPage)
  }, [filteredPrograms, currentProgramsPage])

  const getVisiblePages = (currentPage: number, totalPages: number) => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    if (currentPage <= 2) {
      return [1, 2, 3]
    }

    if (currentPage >= totalPages - 1) {
      return [totalPages - 2, totalPages - 1, totalPages]
    }

    return [currentPage - 1, currentPage, currentPage + 1]
  }

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    setPage: (page: number) => void
  ) => {
    if (totalPages <= 1) return null

    return (
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3"
        >
          &lt;&lt;
        </Button>
        {getVisiblePages(currentPage, totalPages).map((pageNumber) => (
          <Button
            key={`page-${pageNumber}`}
            size="sm"
            variant={currentPage === pageNumber ? 'default' : 'outline'}
            onClick={() => setPage(pageNumber)}
            className="min-w-10 px-3"
          >
            {pageNumber}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3"
        >
          &gt;&gt;
        </Button>
      </div>
    )
  }

  useEffect(() => {
    setCurrentCoursesPage(1)
  }, [searchTerm, activeTab])

  useEffect(() => {
    setCurrentProgramsPage(1)
  }, [programSearchTerm, activeTab])

  useEffect(() => {
    if (currentCoursesPage > coursesTotalPages) {
      setCurrentCoursesPage(coursesTotalPages)
    }
  }, [currentCoursesPage, coursesTotalPages])

  useEffect(() => {
    if (currentProgramsPage > programsTotalPages) {
      setCurrentProgramsPage(programsTotalPages)
    }
  }, [currentProgramsPage, programsTotalPages])

  const openDeleteDialog = (course: Course) => {
    setSelectedCourse(course)
    setEnteredCourseName('')
    setAdminPassword('')
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedCourse) return
    setSubmittingDelete(true)
    try {
      const res = await fetch('/api/admin/courses/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          enteredCourseName,
          password: adminPassword,
        }),
      })

      const payload = await res.json()
      if (!res.ok || payload?.ok === false) {
        const reason = payload?.reason
        const message =
          reason === 'invalid-password'
            ? 'Invalid admin password.'
            : reason === 'name-mismatch'
              ? 'Course name does not match exactly.'
              : reason === 'not-found'
                ? 'Course not found.'
                : payload?.error || 'Failed to delete course.'
        toast({ title: 'Delete blocked', description: message })
        setSubmittingDelete(false)
        return
      }

      // Success: show alert, update local list, close dialog
      toast({ title: 'Deleted', description: 'Course removed.' })
      setCourses((prev) => prev.filter((c) => c.id !== selectedCourse.id))
      setDeleteDialogOpen(false)
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Unexpected error' })
    } finally {
      setSubmittingDelete(false)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Courses</h1>
          <p className="text-muted-foreground mt-2">Manage all your courses and content</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex gap-2">
            <Button
              variant={activeTab === 'courses' ? 'default' : 'outline'}
              onClick={() => setActiveTab('courses')}
            >
              Courses
            </Button>
            <Button
              variant={activeTab === 'programs' ? 'default' : 'outline'}
              onClick={() => setActiveTab('programs')}
            >
              Programs
            </Button>
          </div>

          {/* Mobile: keep quick access to New button in header */}
          <div className="sm:hidden">
            {activeTab === 'courses' ? (
              <TransitionLink href="/admin/courses/new" className="no-underline">
                <Button className="gap-2">
                  <Plus size={16} />
                  New
                </Button>
              </TransitionLink>
            ) : (
              <TransitionLink href="/admin/courses/programs/new" className="no-underline">
                <Button className="gap-2">
                  <Plus size={16} />
                  New
                </Button>
              </TransitionLink>
            )}
          </div>
        </div>
      </div>
      

      {/* Filters and Search */}
      <Card className="bg-card">
        <CardContent className="py-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
              {activeTab === 'courses' ? (
                <Input
                  placeholder="Search courses or instructors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              ) : (
                <Input
                  placeholder="Search programs..."
                  value={programSearchTerm}
                  onChange={(e) => setProgramSearchTerm(e.target.value)}
                  className="pl-10"
                />
              )}
            </div>
            <div className="flex gap-2" />
          </div>
        </CardContent>
      </Card>

      {/* Courses and Programs */}
      {activeTab === 'courses' ? (
        <>
          <div className="space-y-3 md:hidden">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : filteredCourses.length === 0 ? (
              <Card className="bg-card">
                <CardContent className="p-4 text-sm text-muted-foreground">No courses found.</CardContent>
              </Card>
            ) : (
              paginatedCourses.map((course) => (
                <Card key={course.id} className="bg-card shadow-sm">
                  <CardContent className="p-3 space-y-3">
                    <div>
                      <h3 className="font-medium text-foreground leading-tight">{course.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {course.category || '—'} • {course.level || '—'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Students</p>
                        <p className="font-medium text-foreground">{course.students ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rating</p>
                        <p className="font-medium text-foreground">{course.rating ? `${course.rating} ⭐` : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Price</p>
                        <p className="font-medium text-foreground">
                          {course.is_paid ? formatEthiopianBirr(course.price ?? 3000) : 'Free'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium text-foreground">{course.created_at ? new Date(course.created_at).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button variant="outline" size="sm" asChild>
                        <TransitionLink href={`/admin/courses/${course.id}`}>
                          <Eye size={16} className="mr-1" />
                          View
                        </TransitionLink>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <TransitionLink href={`/admin/courses/${course.id}/edit`}>
                          <Edit2 size={16} className="mr-1" />
                          Edit
                        </TransitionLink>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(course)}
                      >
                        <Trash2 size={16} className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            {renderPagination(currentCoursesPage, coursesTotalPages, setCurrentCoursesPage)}
          </div>

          <Card className="bg-card hidden md:block">
            <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">All Courses</CardTitle>
                  <CardDescription>{filteredCourses.length} courses found</CardDescription>
                </div>
                <div>
                  <TransitionLink href="/admin/courses/new" className="no-underline">
                    <Button className="gap-2 hidden sm:inline-flex">
                      <Plus size={16} />
                      New Course
                    </Button>
                  </TransitionLink>
                </div>
              </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Course Title</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Category</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Level</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Students</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Rating</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Price</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Created</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCourses.map((course) => (
                      <tr key={course.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-3 text-foreground font-medium">{course.title}</td>
                        <td className="py-3 px-3 text-muted-foreground">{course.category || '—'}</td>
                        <td className="py-3 px-3 text-muted-foreground">{course.level || '—'}</td>
                        <td className="py-3 px-3 text-foreground">{course.students ?? 0}</td>
                        <td className="py-3 px-3 text-foreground">{course.rating ? `${course.rating} ⭐` : 'N/A'}</td>
                        <td className="py-3 px-3 text-foreground">
                          {course.is_paid ? formatEthiopianBirr(course.price ?? 3000) : 'Free'}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{course.created_at ? new Date(course.created_at).toLocaleDateString() : '—'}</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-2">
                            <TransitionLink href={`/admin/courses/${course.id}`}>
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Eye size={16} />
                              </Button>
                            </TransitionLink>

                            <TransitionLink href={`/admin/courses/${course.id}/edit`}>
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Edit2 size={16} />
                              </Button>
                            </TransitionLink>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(course)}
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
              {renderPagination(currentCoursesPage, coursesTotalPages, setCurrentCoursesPage)}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {programLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : filteredPrograms.length === 0 ? (
              <Card className="bg-card">
                <CardContent className="p-4 text-sm text-muted-foreground">No programs found.</CardContent>
              </Card>
            ) : (
              paginatedPrograms.map((program) => (
                <Card key={program.id} className="bg-card shadow-sm">
                  <CardContent className="p-3 space-y-3">
                    <div>
                      <h3 className="font-medium text-foreground leading-tight">{program.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">/{program.slug}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-medium text-foreground capitalize">{program.status}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Price</p>
                        <p className="font-medium text-foreground">{program.price === null ? '—' : `$${program.price}`}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Updated</p>
                        <p className="font-medium text-foreground">
                          {program.updated_at
                            ? new Date(program.updated_at).toLocaleDateString()
                            : program.created_at
                              ? new Date(program.created_at).toLocaleDateString()
                              : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button variant="outline" size="sm" asChild>
                        <TransitionLink href={`/admin/courses/programs/${program.id}`}>
                          <Eye size={16} className="mr-1" />
                          View
                        </TransitionLink>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <TransitionLink href={`/admin/courses/programs/${program.id}/edit`}>
                          <Edit2 size={16} className="mr-1" />
                          Edit
                        </TransitionLink>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            {renderPagination(currentProgramsPage, programsTotalPages, setCurrentProgramsPage)}
          </div>

          <Card className="bg-card hidden md:block">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">All Programs</CardTitle>
                <CardDescription>{filteredPrograms.length} programs found</CardDescription>
              </div>
              <div>
                <TransitionLink href="/admin/courses/programs/new" className="no-underline">
                  <Button className="gap-2 hidden sm:inline-flex">
                    <Plus size={16} />
                    New Program
                  </Button>
                </TransitionLink>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Program Title</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Slug</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Price</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Updated</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPrograms.map((program) => (
                      <tr key={program.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-3 text-foreground font-medium">{program.title}</td>
                        <td className="py-3 px-3 text-muted-foreground">{program.slug}</td>
                        <td className="py-3 px-3 text-muted-foreground">{program.status}</td>
                        <td className="py-3 px-3 text-foreground">
                          {program.price === null ? '—' : `$${program.price}`}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {program.updated_at
                            ? new Date(program.updated_at).toLocaleDateString()
                            : program.created_at
                              ? new Date(program.created_at).toLocaleDateString()
                              : '—'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-2">
                            <TransitionLink href={`/admin/courses/programs/${program.id}`}>
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Eye size={16} />
                              </Button>
                            </TransitionLink>
                            <TransitionLink href={`/admin/courses/programs/${program.id}/edit`}>
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Edit2 size={16} />
                              </Button>
                            </TransitionLink>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPagination(currentProgramsPage, programsTotalPages, setCurrentProgramsPage)}
              {(programLoading || loading) && (
                <p className="text-xs text-muted-foreground mt-4">Loading...</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm course deletion</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent. To proceed, enter the exact course name and the admin delete password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="courseName">Type the course name exactly</Label>
              <Input
                id="courseName"
                placeholder={selectedCourse?.title || 'Course name'}
                value={enteredCourseName}
                onChange={(e) => setEnteredCourseName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Admin delete password</Label>
              <Input
                id="adminPassword"
                type="password"
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
            {selectedCourse && (
              <p className="text-xs text-muted-foreground">
                Target course: <span className="font-medium">{selectedCourse.title}</span>
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={submittingDelete || !enteredCourseName || !adminPassword}
            >
              {submittingDelete ? 'Deleting…' : 'Confirm delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
