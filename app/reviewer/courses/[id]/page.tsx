"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { useSupabase } from "@/components/providers/supabase-provider"
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

interface Note {
    id: string
    content: string
    status: string
    reviewer_id: string | null
    created_at: string
    addressed?: boolean | null
}

export default function ReviewerCourseDetail() {
    const params = useParams() as { id: string }
    const id = Number(params?.id)
    const [course, setCourse] = useState<any>(null)
    const [lessons, setLessons] = useState<any[]>([])
    const [notes, setNotes] = useState<Note[]>([])
    const [newNote, setNewNote] = useState("")
    const [loading, setLoading] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const router = useRouter()
    const { user } = useSupabase()
    const { toast } = useToast()

    useEffect(() => {
        if (!id) return
        const load = async () => {
            setLoading(true)
            const { data: courseData } = await supabase
                .from("courses")
                .select("*")
                .eq("id", id)
                .single()

            const { data: lessonsData } = await supabase
                .from("lessons")
                .select("*")
                .eq("course_id", id)
                .order("step_order", { ascending: true })

            const { data: notesData } = await supabase
                .from("course_review_notes")
                .select("id, content, status, reviewer_id, created_at, addressed")
                .eq("course_id", id)
                .order("created_at", { ascending: false })

            setCourse(courseData)
            setLessons(lessonsData || [])
            setNotes(notesData || [])
            setLoading(false)
        }
        load()
    }, [id])

    const addNote = async () => {
        if (!user || !newNote.trim()) return
        const { data, error } = await supabase
            .from("course_review_notes")
            .insert({
                course_id: id,
                reviewer_id: user.id,
                content: newNote.trim(),
                status: "open",
            })
            .select("id, content, status, reviewer_id, created_at")
            .single()

        if (!error && data) {
            setNotes((prev) => [data, ...prev])
            setNewNote("")
        }
    }

    const publishCourse = async () => {
        setPublishing(true)
        const { error } = await supabase
            .from("courses")
            .update({ status: "published", published: true })
            .eq("id", id)

        if (error) {
            toast({ title: "Publish failed", description: error.message })
        } else {
            toast({ title: "Published", description: "Course is now published." })
            setCourse((prev: any) => prev ? { ...prev, status: "published", published: true } : prev)
        }
        setPublishing(false)
        setConfirmOpen(false)
    }

    if (!course) {
        return (
            <div className="p-8">
                <Card className="bg-card max-w-4xl mx-auto"><CardContent>Loading…</CardContent></Card>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-6">
            <Card className="max-w-4xl mx-auto bg-card">
                <CardHeader>
                    <CardTitle>{course.title}</CardTitle>
                    <CardDescription>{course.category} — {course.level}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-muted-foreground">Status: {course.status || (course.published ? "published" : "draft")}</div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setConfirmOpen(true)} disabled={publishing || course.published}>
                                {course.published ? "Published" : "Publish"}
                            </Button>
                            <Button variant="ghost" onClick={() => router.back()}>Back</Button>
                        </div>
                    </div>

                    <div className="mb-4">
                        <p className="text-muted-foreground">{course.description}</p>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Lessons</h3>
                        {lessons.length === 0 && <p className="text-muted-foreground">No lessons yet.</p>}
                        {lessons.map((l) => (
                            <div key={l.id} className="p-3 border rounded">
                                <div className="flex justify-between">
                                    <div>
                                        <div className="font-medium">{l.title}</div>
                                        <div className="text-sm text-muted-foreground">{l.estimated_time ?? '—'} minutes</div>
                                    </div>
                                    <div>
                                        <Button variant="outline" size="sm" onClick={() => router.push(`/learn/course/${course.slug}/lesson/${l.step_order}`)}>View Lesson</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 space-y-3">
                        <h3 className="text-lg font-semibold">Reviewer Notes</h3>
                        <Textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Add a note for admin…"
                        />
                        <Button onClick={addNote} disabled={!newNote.trim()}>Attach Note</Button>

                        <div className="mt-4 space-y-3">
                            {notes.length === 0 && <p className="text-muted-foreground">No notes yet.</p>}
                            {notes.map((n) => {
                                const isAddressed = n.addressed || n.status === "resolved"
                                return (
                                    <div key={n.id} className="p-3 border rounded">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span className={isAddressed ? "text-emerald-700" : "text-amber-700"}>
                                                {isAddressed ? "Addressed" : "Open"}
                                            </span>
                                            <span>·</span>
                                            <span>{new Date(n.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="mt-1">{n.content}</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Publish this course?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will set the course to published and make it visible to learners.
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
        </div>
    )
}
