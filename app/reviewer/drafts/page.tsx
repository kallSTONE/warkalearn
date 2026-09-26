"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { Eye } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"

interface Course {
    id: number
    title: string
    slug?: string | null
    category?: string | null
    level?: string | null
    students?: number | null
    status?: string | null
    published?: boolean | null
}

export default function ReviewerDraftsPage() {
    const [drafts, setDrafts] = useState<Course[]>([])
    const [loading, setLoading] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [selected, setSelected] = useState<Course | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        const loadDrafts = async () => {
            setLoading(true)
            const { data } = await supabase
                .from("courses")
                .select("id, title, slug, category, level, students, status, published")
                .or("status.eq.draft,published.eq.false")
                .order("id", { ascending: false })
            setDrafts(data || [])
            setLoading(false)
        }
        loadDrafts()
    }, [])

    const openConfirm = (course: Course) => {
        setSelected(course)
        setConfirmOpen(true)
    }

    const publishCourse = async () => {
        if (!selected) return
        setPublishing(true)
        const { error } = await supabase
            .from("courses")
            .update({ status: "published", published: true })
            .eq("id", selected.id)

        if (error) {
            toast({ title: "Publish failed", description: error.message })
        } else {
            toast({ title: "Course published", description: `${selected.title} is now published.` })
            setDrafts((prev) => prev.filter((c) => c.id !== selected.id))
        }
        setPublishing(false)
        setConfirmOpen(false)
        setSelected(null)
    }

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Draft Courses</h1>
                <p className="text-muted-foreground mt-2">Unpublished or draft courses</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Drafts</CardTitle>
                    <CardDescription>{drafts.length} results</CardDescription>
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
                                    <th className="text-left py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drafts.map((c) => (
                                    <tr key={c.id} className="border-b border-border hover:bg-muted/50">
                                        <td className="py-4 px-4">{c.title}</td>
                                        <td className="py-4 px-4">{c.category || '—'}</td>
                                        <td className="py-4 px-4">{c.level || '—'}</td>
                                        <td className="py-4 px-4">{c.students ?? 0}</td>
                                        <td className="py-4 px-4">
                                            <Link href={`/reviewer/courses/${c.id}`}>
                                                <Button variant="ghost" size="sm" className="gap-1">
                                                    <Eye size={16} />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="ml-2"
                                                onClick={() => openConfirm(c)}
                                            >
                                                Publish
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Publish course?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will set the course to published and make it visible. Continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={publishing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={publishCourse} disabled={publishing}>
                            {publishing ? "Publishing…" : "Publish"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {loading && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
        </div>
    )
}
