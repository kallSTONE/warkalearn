"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useSupabase } from "@/components/providers/supabase-provider"

type DraftRow = {
    id: string
    user_id: string
    updated_at: string
}

export default function DraftsPage() {
    const { toast } = useToast()
    const { user, loading } = useSupabase()
    const [rows, setRows] = useState<DraftRow[]>([])
    const [busy, setBusy] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage))

    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return rows.slice(start, start + itemsPerPage)
    }, [currentPage, rows])

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages)
        }
    }, [currentPage, totalPages])

    const loadDrafts = async () => {
        if (loading) return
        setBusy(true)
        try {
            const { data, error } = await supabase
                .from("course_drafts")
                .select("id,user_id,updated_at")
                .order("updated_at", { ascending: false })

            if (error) throw error
            setRows((data as DraftRow[]) || [])
        } catch (e: any) {
            toast({ title: "Error", description: e?.message ?? "Failed to load drafts" })
        } finally {
            setBusy(false)
        }
    }

    useEffect(() => {
        loadDrafts()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading])

    const clearAll = async () => {
        if (!user) return
        setBusy(true)
        try {
            const { error } = await supabase.from("course_drafts").delete().neq("user_id", "")
            if (error) throw error
            toast({ title: "All drafts cleared" })
            loadDrafts()
        } catch (e: any) {
            toast({ title: "Error", description: e?.message ?? "Failed to clear drafts" })
        } finally {
            setBusy(false)
        }
    }

    const clearMine = async () => {
        if (!user) return
        setBusy(true)
        try {
            const { error } = await supabase.from("course_drafts").delete().eq("user_id", user.id)
            if (error) throw error
            toast({ title: "Your draft cleared" })
            loadDrafts()
        } catch (e: any) {
            toast({ title: "Error", description: e?.message ?? "Failed to clear your draft" })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="p-4 md:p-8">
            <Card className="max-w-4xl mx-auto bg-card shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <CardTitle className="text-xl">Course Drafts</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">Review and clear autosaved course drafts.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            <Button className="w-full sm:w-auto" variant="outline" onClick={loadDrafts} disabled={busy}>Refresh</Button>
                            <Button className="w-full sm:w-auto" variant="ghost" onClick={clearMine} disabled={busy || !user}>Clear Mine</Button>
                            <Button className="w-full sm:w-auto" variant="destructive" onClick={clearAll} disabled={busy || !user}>Clear All</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    {rows.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No drafts found.</div>
                    ) : (
                        <div className="space-y-2">
                            {paginatedRows.map((r) => (
                                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-border/70 p-3 shadow-sm">
                                    <div className="text-sm">
                                        <div>Draft ID: {r.id}</div>
                                        <div className="text-muted-foreground">User: {r.user_id}</div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Updated: {new Date(r.updated_at).toLocaleString()}
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
                            {Array.from({ length: totalPages }).map((_, index) => {
                                const page = index + 1
                                return (
                                    <Button
                                        key={`draft-page-${page}`}
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
