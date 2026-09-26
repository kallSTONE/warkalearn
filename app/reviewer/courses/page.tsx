"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Search, Eye } from "lucide-react"

interface Course {
    id: number
    title: string
    slug?: string | null
    category?: string | null
    level?: string | null
    students?: number | null
    status?: string | null
    published?: boolean | null
    created_at?: string | null
}

export default function ReviewerCoursesPage() {
    const [courses, setCourses] = useState<Course[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const loadCourses = async () => {
            setLoading(true)
            const { data } = await supabase
                .from("courses")
                .select("id, title, slug, category, level, students, status, published, created_at")
                .order("created_at", { ascending: false })
            setCourses(data || [])
            setLoading(false)
        }
        loadCourses()
    }, [])

    const filtered = courses.filter((c) => {
        const q = searchTerm.toLowerCase()
        return (
            (c.title || '').toLowerCase().includes(q) ||
            (c.category || '').toLowerCase().includes(q) ||
            (c.level || '').toLowerCase().includes(q)
        )
    })

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">All Courses</h1>
                    <p className="text-muted-foreground mt-2">View and review all courses</p>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
                            <Input
                                placeholder="Search courses..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Courses</CardTitle>
                    <CardDescription>{filtered.length} results</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left py-3 px-4">Title</th>
                                    <th className="text-left py-3 px-4">Category</th>
                                    <th className="text-left py-3 px-4">Level</th>
                                    <th className="text-left py-3 px-4">Students</th>
                                    <th className="text-left py-3 px-4">Status</th>
                                    <th className="text-left py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((course) => (
                                    <tr key={course.id} className="border-b border-border hover:bg-muted/50">
                                        <td className="py-4 px-4">{course.title}</td>
                                        <td className="py-4 px-4">{course.category || '—'}</td>
                                        <td className="py-4 px-4">{course.level || '—'}</td>
                                        <td className="py-4 px-4">{course.students ?? 0}</td>
                                        <td className="py-4 px-4">{course.status || (course.published === false ? 'draft' : 'published')}</td>
                                        <td className="py-4 px-4">
                                            <Link href={`/reviewer/courses/${course.id}`}>
                                                <Button variant="ghost" size="sm" className="gap-1">
                                                    <Eye size={16} />
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {loading && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
        </div>
    )
}
