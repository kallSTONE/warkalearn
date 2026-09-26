"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useSupabase } from "@/components/providers/supabase-provider"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Trash2, Plus, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type Course = {
    id: string
    title: string
    slug: string
    lessons: Array<{ id: string; title: string; step_order: number }>
}

type AdminQuestion = {
    question: string
    options: string[]
    correct_option: number
}

export default function AdminQuizzesPage() {
    const { user } = useSupabase()
    const { toast } = useToast()

    const [loading, setLoading] = useState(true)
    const [courses, setCourses] = useState<Course[]>([])
    const [selectedCourseId, setSelectedCourseId] = useState<string>("")
    const [selectedLessonId, setSelectedLessonId] = useState<string>("")

    const [quizId, setQuizId] = useState<string | null>(null)
    const [isRequired, setIsRequired] = useState<boolean>(false)
    const [questions, setQuestions] = useState<AdminQuestion[]>([])
    const [saving, setSaving] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmLessonValue, setConfirmLessonValue] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const deletePassword = process.env.NEXT_PUBLIC_QUIZ_DELETE_PASSWORD || "delete"

    // Guard: only admins should access (layout already handles redirects)
    useEffect(() => {
        if (user !== undefined) setLoading(false)
    }, [user])

    useEffect(() => {
        const loadCourses = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from("courses")
                .select("id, title, slug, lessons(id, title, step_order)")
                .order("title", { ascending: true })

            if (error) {
                toast({ title: "Failed to load courses", description: error.message, variant: "destructive" })
            }
            const normalized: Course[] = (data || []).map((c: any) => ({
                id: c.id.toString(),
                title: c.title,
                slug: c.slug,
                lessons: (c.lessons || [])
                    .sort((a: any, b: any) => a.step_order - b.step_order)
                    .map((l: any) => ({ id: l.id.toString(), title: l.title, step_order: l.step_order })),
            }))
            setCourses(normalized)
            setLoading(false)
        }
        loadCourses()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId) || null, [courses, selectedCourseId])
    const selectedLesson = useMemo(() => selectedCourse?.lessons.find(l => l.id === selectedLessonId) || null, [selectedCourse, selectedLessonId])

    useEffect(() => {
        // Reset lesson and quiz when course changes
        setSelectedLessonId("")
        setQuizId(null)
        setIsRequired(false)
        setQuestions([])
    }, [selectedCourseId])

    useEffect(() => {
        if (!selectedLessonId) return
        const loadQuiz = async () => {
            setSaving(true)
            // Load quiz meta
            const lessonId = Number(selectedLessonId)
            if (!Number.isFinite(lessonId)) {
                setQuizId(null)
                setIsRequired(false)
                setQuestions([])
                setSaving(false)
                return
            }

            const { data: quizMeta } = await supabase
                .from("quizzes")
                .select("id, is_required")
                .eq("lesson_id", lessonId)
                .maybeSingle()

            if (quizMeta?.id) {
                setQuizId(quizMeta.id)
                setIsRequired(!!quizMeta.is_required)
                // Load questions
                const { data: qq } = await supabase
                    .from("quiz_questions")
                    .select("id, questions")
                    .eq("quiz_id", quizMeta.id)
                    .maybeSingle()

                if (qq?.questions && Array.isArray(qq.questions)) {
                    setQuestions(qq.questions as AdminQuestion[])
                } else {
                    setQuestions([])
                }
            } else {
                setQuizId(null)
                setIsRequired(false)
                setQuestions([])
            }
            setSaving(false)
        }
        loadQuiz()
    }, [selectedLessonId])

    const addQuestion = () => {
        setQuestions(qs => ([...qs, { question: "", options: ["", "", "", ""], correct_option: 0 }]))
    }

    const updateQuestionField = (idx: number, field: keyof AdminQuestion, value: any) => {
        setQuestions(qs => qs.map((q, i) => (i === idx ? { ...q, [field]: value } : q)))
    }

    const updateOption = (qIdx: number, optIdx: number, value: string) => {
        setQuestions(qs => qs.map((q, i) => {
            if (i !== qIdx) return q
            const next = [...q.options]
            next[optIdx] = value
            return { ...q, options: next }
        }))
    }

    const addOption = (qIdx: number) => {
        setQuestions(qs => qs.map((q, i) => (i === qIdx ? { ...q, options: [...q.options, ""] } : q)))
    }

    const removeOption = (qIdx: number, optIdx: number) => {
        setQuestions(qs => qs.map((q, i) => {
            if (i !== qIdx) return q
            const next = q.options.filter((_, oi) => oi !== optIdx)
            const nextCorrect = q.correct_option >= next.length ? Math.max(0, next.length - 1) : q.correct_option
            return { ...q, options: next, correct_option: nextCorrect }
        }))
    }

    const removeQuestion = (idx: number) => {
        const q = questions[idx]
        const label = q?.question?.trim() ? `"${q.question.trim().slice(0, 80)}"` : `#${idx + 1}`
        const ok = typeof window !== "undefined" ? window.confirm(`Delete question ${label}? This cannot be undone.`) : true
        if (!ok) return
        setQuestions(qs => qs.filter((_, i) => i !== idx))
    }

    const saveQuiz = async () => {
        if (!selectedLessonId) {
            toast({ title: "Select a lesson", description: "Choose a course and lesson first." })
            return
        }
        // Basic validation (use index loop to avoid downlevel iteration requirements)
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i]
            if (!q.question.trim()) {
                toast({ title: `Question ${i + 1} missing text`, variant: "destructive" })
                return
            }
            if (!q.options.length || q.options.some(o => !o.trim())) {
                toast({ title: `Question ${i + 1} has empty options`, variant: "destructive" })
                return
            }
            if (q.correct_option < 0 || q.correct_option >= q.options.length) {
                toast({ title: `Question ${i + 1} invalid correct option index`, variant: "destructive" })
                return
            }
        }

        setSaving(true)
        try {
            let currentQuizId = quizId
            if (!currentQuizId) {
                const lessonId = Number(selectedLessonId)
                const courseId = Number(selectedCourseId)
                if (!Number.isFinite(lessonId)) {
                    throw new Error("Invalid lesson id")
                }
                if (!Number.isFinite(courseId)) {
                    throw new Error("Invalid course id")
                }
                // Create quiz for lesson
                const { data: created, error } = await supabase
                    .from("quizzes")
                    .insert({ course_id: courseId, lesson_id: lessonId, is_required: isRequired })
                    .select("id")
                    .single()
                if (error) throw error
                currentQuizId = created.id
                setQuizId(created.id)
            } else {
                // Update quiz settings
                const { error } = await supabase
                    .from("quizzes")
                    .update({ is_required: isRequired })
                    .eq("id", currentQuizId)
                if (error) throw error
            }

            // Upsert quiz questions
            // Try update first; if none, insert
            const { data: existingQQ } = await supabase
                .from("quiz_questions")
                .select("id")
                .eq("quiz_id", currentQuizId!)
                .maybeSingle()

            if (existingQQ?.id) {
                const { error: qErr } = await supabase
                    .from("quiz_questions")
                    .update({ questions })
                    .eq("id", existingQQ.id)
                if (qErr) throw qErr
            } else {
                const { error: qErr } = await supabase
                    .from("quiz_questions")
                    .insert({ quiz_id: currentQuizId!, questions })
                if (qErr) throw qErr
            }

            toast({ title: "Quiz saved", description: "Your changes are live." })
        } catch (e: any) {
            toast({ title: "Failed to save quiz", description: e.message, variant: "destructive" })
        } finally {
            setSaving(false)
        }
    }

    const deleteQuiz = async () => {
        if (!quizId) return
        setSaving(true)
        try {
            const { error } = await supabase
                .from("quizzes")
                .delete()
                .eq("id", quizId)
            if (error) throw error

            // Reset local state
            setQuizId(null)
            setIsRequired(false)
            setQuestions([])
            setConfirmLessonValue("")
            setConfirmPassword("")
            setConfirmOpen(false)
            toast({ title: "Quiz deleted", description: "Associated questions removed." })
        } catch (e: any) {
            toast({ title: "Failed to delete quiz", description: e.message, variant: "destructive" })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="p-6">Loading…</div>
    }

    return (
        <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                <div className="w-full lg:w-80">
                    <Label>Course</Label>
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                        <SelectContent>
                            {courses.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full lg:w-80">
                    <Label>Lesson</Label>
                    <Select value={selectedLessonId} onValueChange={setSelectedLessonId} disabled={!selectedCourse}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a lesson" />
                        </SelectTrigger>
                        <SelectContent>
                            {(selectedCourse?.lessons || []).map(l => (
                                <SelectItem key={l.id} value={l.id}>Lesson {l.step_order}: {l.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full lg:w-auto lg:ml-auto flex flex-wrap items-center gap-3">
                    <Label className="mr-0 lg:mr-2">Required</Label>
                    <Switch checked={isRequired} onCheckedChange={setIsRequired} disabled={!selectedLessonId} />
                    <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => setConfirmOpen(true)}
                        disabled={!quizId || saving || !selectedLesson}
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Quiz
                    </Button>
                </div>
            </div>

            <Card className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-semibold">Quiz Questions</h2>
                        <p className="text-sm text-muted-foreground">One quiz per lesson. These display in the lawyer lesson page.</p>
                    </div>
                    <Button className="w-full sm:w-auto" onClick={addQuestion} disabled={!selectedLessonId}>
                        <Plus className="w-4 h-4 mr-2" /> Add Question
                    </Button>
                </div>

                {questions.length === 0 && (
                    <div className="text-sm text-muted-foreground mt-4">No questions yet. Add your first one.</div>
                )}

                <div className="mt-4 space-y-6">
                    {questions.map((q, idx) => (
                        <div key={idx} className="border rounded-md p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                                <div className="flex-1">
                                    <Label>Question {idx + 1}</Label>
                                    <Input
                                        className="mt-1"
                                        value={q.question}
                                        onChange={e => updateQuestionField(idx, "question", e.target.value)}
                                        placeholder="Enter question text"
                                    />
                                </div>
                                <Button variant="ghost" className="text-red-600" onClick={() => removeQuestion(idx)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="mt-4">
                                <div className="flex items-center justify-between">
                                    <Label>Options</Label>
                                    <Button variant="outline" size="sm" onClick={() => addOption(idx)}>
                                        <Plus className="w-4 h-4 mr-2" /> Add Option
                                    </Button>
                                </div>

                                <div className="mt-2 space-y-2">
                                    {q.options.map((opt, oi) => (
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3" key={oi}>
                                            <input
                                                type="radio"
                                                name={`correct-${idx}`}
                                                checked={q.correct_option === oi}
                                                onChange={() => updateQuestionField(idx, "correct_option", oi)}
                                            />
                                            <Input
                                                value={opt}
                                                onChange={e => updateOption(idx, oi, e.target.value)}
                                                placeholder={`Option ${oi + 1}`}
                                                className="flex-1"
                                            />
                                            <Button variant="ghost" size="icon" className="self-end sm:self-auto" onClick={() => removeOption(idx, oi)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-3">
                    <Button className="w-full sm:w-auto" onClick={saveQuiz} disabled={!selectedLessonId || saving}>
                        <Save className="w-4 h-4 mr-2" /> Save Changes
                    </Button>
                </div>
            </Card>

            <div className="text-sm text-muted-foreground">
                Tip: Lawyers see quizzes inline in the lesson page using the same schema: each question has text, options, and a correct option index.
            </div>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete quiz for this lesson?</DialogTitle>
                        <DialogDescription>
                            Type the lesson title and admin delete password to confirm. This removes the quiz and its questions.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div>
                            <Label>Lesson title confirmation</Label>
                            <Input
                                className="mt-1"
                                value={confirmLessonValue}
                                onChange={e => setConfirmLessonValue(e.target.value)}
                                placeholder={selectedLesson ? selectedLesson.title : "Lesson title"}
                            />
                        </div>
                        <div>
                            <Label>Admin delete password</Label>
                            <Input
                                type="password"
                                className="mt-1"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Enter delete password"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Password is configured with NEXT_PUBLIC_QUIZ_DELETE_PASSWORD (default: "delete").
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={deleteQuiz}
                            disabled={
                                saving ||
                                !selectedLesson ||
                                confirmLessonValue.trim() !== (selectedLesson?.title || "") ||
                                confirmPassword !== deletePassword
                            }
                        >
                            Delete quiz
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
