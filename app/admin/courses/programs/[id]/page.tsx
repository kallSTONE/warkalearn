"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useRouteLoading } from "@/components/route-loading-provider"

type ProgramCourseRow = {
    sort_order: number | null
    is_required: boolean | null
    courses: {
        id: number
        title: string
        slug: string
        level: string | null
        category: string | null
    } | null
}

type ProgramRow = {
    id: string
    title: string
    slug: string
    description: string | null
    status: string
    thumbnail: string | null
    price: number | null
    program_courses: ProgramCourseRow[] | null
}

export default function ProgramDetailPage() {
    const params = useParams() as { id: string }
    const programId = params?.id
    const router = useRouter()
    const { startLoading } = useRouteLoading()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [program, setProgram] = useState<ProgramRow | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        if (!programId) return

        const load = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from("programs")
                .select(
                    "id, title, slug, description, status, thumbnail, price, program_courses (sort_order, is_required, courses (id, title, slug, level, category))"
                )
                .eq("id", programId)
                .order("sort_order", { foreignTable: "program_courses", ascending: true })
                .single()

            setLoading(false)
            if (error) {
                toast({ title: "Error", description: error.message })
                return
            }

            setProgram(data as ProgramRow)
        }

        load()
    }, [programId, toast])

    if (loading || !program) {
        return (
            <div className="p-4 md:p-8">
                <Card className="bg-card">
                    <CardContent>
                        <p>Loading...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const programCourses = program.program_courses ?? []
    const totalPages = Math.max(1, Math.ceil(programCourses.length / itemsPerPage))

    const paginatedProgramCourses = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return programCourses.slice(start, start + itemsPerPage)
    }, [currentPage, programCourses])

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages)
        }
    }, [currentPage, totalPages])

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
            <Card className="bg-card">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl md:text-2xl">{program.title}</CardTitle>
                            <CardDescription className="mt-2">{program.slug}</CardDescription>
                        </div>
                        <Badge variant={program.status === "published" ? "default" : "secondary"}>
                            {program.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {program.thumbnail && (
                        <div className="rounded-lg border border-border overflow-hidden">
                            <img src={program.thumbnail} alt={program.title} className="w-full h-48 object-cover" />
                        </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                        {program.description || "No description yet."}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                        <span className="rounded-full border border-border px-3 py-1">
                            Price: {program.price === null ? "Free" : `$${program.price}`}
                        </span>
                        <span className="rounded-full border border-border px-3 py-1">
                            Courses: {programCourses.length}
                        </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                            className="w-full sm:w-auto"
                            variant="outline"
                            onClick={() => {
                                startLoading()
                                router.back()
                            }}
                        >
                            Back
                        </Button>
                        <Button
                            className="w-full sm:w-auto"
                            onClick={() => {
                                startLoading()
                                router.push(`/admin/courses/programs/${program.id}/edit`)
                            }}
                        >
                            Edit Program
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card">
                <CardHeader>
                    <CardTitle>Program Courses</CardTitle>
                    <CardDescription>Ordered list of courses in this program.</CardDescription>
                </CardHeader>
                <CardContent>
                    {programCourses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No courses added yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {paginatedProgramCourses.map((row, index) => (
                                <div key={`${row.courses?.id ?? index}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-lg p-3">
                                    <div className="space-y-1">
                                        <div className="font-medium">{row.courses?.title ?? "Untitled course"}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {row.courses?.category ?? "Uncategorized"} · {row.courses?.level ?? "Level not set"}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="rounded-full border border-border px-2 py-1">Order {row.sort_order ?? index + 1}</span>
                                        {row.is_required ? (
                                            <Badge variant="default">Required</Badge>
                                        ) : (
                                            <Badge variant="secondary">Optional</Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {totalPages > 1 && (
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="px-3"
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                &lt;&lt;
                            </Button>
                            {Array.from({ length: totalPages }).map((_, idx) => {
                                const page = idx + 1
                                return (
                                    <Button
                                        key={`program-course-page-${page}`}
                                        size="sm"
                                        variant={currentPage === page ? "default" : "outline"}
                                        className="min-w-10 px-3"
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </Button>
                                )
                            })}
                            <Button
                                size="sm"
                                variant="outline"
                                className="px-3"
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                &gt;&gt;
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
