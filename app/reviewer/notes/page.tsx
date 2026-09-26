"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useSupabase } from "@/components/providers/supabase-provider"
import Link from "next/link"

interface NoteItem {
    id: string
    course_id: number
    content: string
    status: string
    created_at: string
    addressed?: boolean | null
}

export default function ReviewerNotesPage() {
    const { user } = useSupabase()
    const [notes, setNotes] = useState<NoteItem[]>([])

    useEffect(() => {
        const loadNotes = async () => {
            if (!user) return
            const { data } = await supabase
                .from("course_review_notes")
                .select("id, course_id, content, status, created_at, addressed")
                .eq("reviewer_id", user.id)
                .order("created_at", { ascending: false })
            setNotes(data || [])
        }
        loadNotes()
    }, [user])

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Review Notes</h1>
                <p className="text-muted-foreground mt-2">Notes you have attached to courses</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Notes</CardTitle>
                    <CardDescription>{notes.length} items</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
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
                                <Link href={`/reviewer/courses/${n.course_id}`} className="text-primary underline text-sm mt-1 inline-block">View course</Link>
                            </div>
                        )
                    })}
                </CardContent>
            </Card>
        </div>
    )
}
