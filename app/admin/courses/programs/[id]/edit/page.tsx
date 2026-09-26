"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { GripVertical } from "lucide-react"
import { useRouteLoading } from "@/components/route-loading-provider"

const statusOptions = ["draft", "published"] as const

type CourseOption = {
    id: number
    title: string
}

type ProgramCourseDraft = {
    course_id: number | ""
    sort_order: number
    is_required: boolean
}

export default function EditProgramPage() {
    const params = useParams() as { id: string }
    const programId = params?.id
    const router = useRouter()
    const { startLoading } = useRouteLoading()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [courses, setCourses] = useState<CourseOption[]>([])

    const [title, setTitle] = useState("")
    const [slug, setSlug] = useState("")
    const [description, setDescription] = useState("")
    const [status, setStatus] = useState<(typeof statusOptions)[number]>("draft")
    const [thumbnail, setThumbnail] = useState("")
    const [price, setPrice] = useState("")

    const [programCourses, setProgramCourses] = useState<ProgramCourseDraft[]>([])
    const [dragIndex, setDragIndex] = useState<number | null>(null)
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
    const [removeIndex, setRemoveIndex] = useState<number | null>(null)

    useEffect(() => {
        if (!programId) return

        const load = async () => {
            setLoading(true)
            const [programRes, coursesRes, programCoursesRes] = await Promise.all([
                supabase
                    .from("programs")
                    .select("id, title, slug, description, status, thumbnail, price")
                    .eq("id", programId)
                    .single(),
                supabase
                    .from("courses")
                    .select("id, title")
                    .order("title", { ascending: true }),
                supabase
                    .from("program_courses")
                    .select("course_id, sort_order, is_required")
                    .eq("program_id", programId)
                    .order("sort_order", { ascending: true }),
            ])

            if (programRes.error) {
                toast({ title: "Error", description: programRes.error.message })
                setLoading(false)
                return
            }

            if (coursesRes.error) {
                toast({ title: "Error", description: coursesRes.error.message })
                setLoading(false)
                return
            }

            if (programCoursesRes.error) {
                toast({ title: "Error", description: programCoursesRes.error.message })
                setLoading(false)
                return
            }

            const program = programRes.data
            setTitle(program.title ?? "")
            setSlug(program.slug ?? "")
            setDescription(program.description ?? "")
            setStatus((program.status as (typeof statusOptions)[number]) ?? "draft")
            setThumbnail(program.thumbnail ?? "")
            setPrice(program.price === null || program.price === undefined ? "" : String(program.price))

            setCourses(coursesRes.data || [])
            setProgramCourses(
                (programCoursesRes.data || []).map((row) => ({
                    course_id: row.course_id,
                    sort_order: row.sort_order ?? 0,
                    is_required: Boolean(row.is_required),
                }))
            )

            setLoading(false)
        }

        load()
    }, [programId, toast])

    const addCourseRow = () => {
        setProgramCourses((prev) => [
            ...prev,
            {
                course_id: "",
                sort_order: prev.length + 1,
                is_required: false,
            },
        ])
    }

    const updateCourseRow = (index: number, patch: Partial<ProgramCourseDraft>) => {
        setProgramCourses((prev) => {
            const next = [...prev]
            next[index] = { ...next[index], ...patch }
            return next
        })
    }

    const removeCourseRow = (index: number) => {
        setProgramCourses((prev) => prev.filter((_, idx) => idx !== index))
    }

    const requestRemoveCourse = (index: number) => {
        setRemoveIndex(index)
        setRemoveDialogOpen(true)
    }

    const confirmRemoveCourse = () => {
        if (removeIndex === null) return
        removeCourseRow(removeIndex)
        setRemoveIndex(null)
        setRemoveDialogOpen(false)
    }

    const reorderCourseRows = (fromIndex: number, toIndex: number) => {
        setProgramCourses((prev) => {
            const next = [...prev]
            const [moved] = next.splice(fromIndex, 1)
            next.splice(toIndex, 0, moved)
            return next.map((row, idx) => ({ ...row, sort_order: idx + 1 }))
        })
    }

    const handleDrop = (index: number) => {
        if (dragIndex === null || dragIndex === index) {
            setDragIndex(null)
            return
        }
        reorderCourseRows(dragIndex, index)
        setDragIndex(null)
    }

    const handleSave = async () => {
        if (!title.trim() || !slug.trim()) {
            toast({ title: "Missing fields", description: "Title and slug are required." })
            return
        }

        const parsedPrice = price.trim() === "" ? null : Number(price)
        if (parsedPrice !== null && Number.isNaN(parsedPrice)) {
            toast({ title: "Invalid price", description: "Price must be a number." })
            return
        }

        setSaving(true)

        try {
            const { error: programError } = await supabase
                .from("programs")
                .update({
                    title: title.trim(),
                    slug: slug.trim(),
                    description: description.trim() || null,
                    status,
                    thumbnail: thumbnail.trim() || null,
                    price: parsedPrice,
                })
                .eq("id", programId)

            if (programError) {
                throw programError
            }

            const { error: deleteError } = await supabase
                .from("program_courses")
                .delete()
                .eq("program_id", programId)

            if (deleteError) {
                throw deleteError
            }

            const rows = programCourses
                .filter((row) => row.course_id !== "")
                .map((row, index) => ({
                    program_id: programId,
                    course_id: row.course_id as number,
                    sort_order: Number(row.sort_order) || index + 1,
                    is_required: Boolean(row.is_required),
                }))

            if (rows.length > 0) {
                const { error: coursesError } = await supabase
                    .from("program_courses")
                    .insert(rows)

                if (coursesError) {
                    throw coursesError
                }
            }

            toast({ title: "Program updated", description: "Changes saved." })
            startLoading()
            router.push("/admin/courses?tab=programs")
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "Failed to update program." })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="p-4 md:p-8">
                <Card className="bg-card shadow-sm">
                    <CardContent className="pt-6">
                        <p>Loading...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
            <Card className="bg-card shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xl">Edit Program</CardTitle>
                    <CardDescription>Update program details and courses.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-0">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug</Label>
                            <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={status}
                                onValueChange={(value) => setStatus(value as (typeof statusOptions)[number])}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="thumbnail">Thumbnail URL</Label>
                            <Input
                                id="thumbnail"
                                value={thumbnail}
                                onChange={(e) => setThumbnail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price</Label>
                            <Input
                                id="price"
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-border/70 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-lg font-semibold">Program Courses</h3>
                                <p className="text-sm text-muted-foreground">Add courses, set order, and mark required.</p>
                            </div>
                            <Button className="w-full sm:w-auto shadow-sm" variant="outline" onClick={addCourseRow}>
                                Add Course
                            </Button>
                        </div>

                        {programCourses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No courses added yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {programCourses.map((row, index) => (
                                    <div
                                        key={`course-${index}`}
                                        className="grid grid-cols-1 items-center gap-3 rounded-xl border border-border/70 p-3 md:grid-cols-[auto_1fr_140px_140px_auto]"
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={() => handleDrop(index)}
                                    >
                                        <div
                                            className="flex items-center justify-center text-muted-foreground cursor-grab"
                                            draggable
                                            onDragStart={() => setDragIndex(index)}
                                            onDragEnd={() => setDragIndex(null)}
                                            aria-label="Drag to reorder"
                                        >
                                            <GripVertical size={18} />
                                        </div>
                                        <Select
                                            value={row.course_id === "" ? "" : String(row.course_id)}
                                            onValueChange={(value) =>
                                                updateCourseRow(index, { course_id: value ? Number(value) : "" })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select course" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {courses.map((course) => (
                                                    <SelectItem key={course.id} value={String(course.id)}>
                                                        {course.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number"
                                            value={row.sort_order}
                                            onChange={(e) => updateCourseRow(index, { sort_order: Number(e.target.value) })}
                                        />
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={row.is_required}
                                                onCheckedChange={(checked) =>
                                                    updateCourseRow(index, { is_required: Boolean(checked) })
                                                }
                                            />
                                            <span className="text-sm">Required</span>
                                        </div>
                                        <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => requestRemoveCourse(index)}>
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
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
                            Cancel
                        </Button>
                        <Button className="w-full sm:w-auto" onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove course?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This removes the course from the program. You can add it again later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemoveCourse}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
