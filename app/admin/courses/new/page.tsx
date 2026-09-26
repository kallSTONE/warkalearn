"use client"

import { useState, useEffect } from "react"
import { useSupabase } from '@/components/providers/supabase-provider'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Checkbox } from "@/components/ui/checkbox"

type TopicItem = {
    key: string
    value: string
}

type Lesson = {
    id: number
    title: string
    time: number
    video?: string
    description?: string
    video_url?: string
    topics: TopicItem[]
    downloads: LessonDownload[]
}


type LessonDownload = {
    title: string
    description?: string
    file_url: string
    file_type: string
    file_size: number
}


export default function NewCoursePage() {
    const router = useRouter()
    const { toast } = useToast()
    const { user, loading: userLoading } = useSupabase()

    const [step, setStep] = useState(1)

    // Draft support (local + server)
    const DRAFT_KEY = 'recentCourseDraft'
    const [hasLocalDraft, setHasLocalDraft] = useState(false)
    const [hasServerDraft, setHasServerDraft] = useState(false)

    // Course fields
    const [title, setTitle] = useState("")
    const [slug, setSlug] = useState("")
    const [description, setDescription] = useState("")
    const [image, setImage] = useState("")
    const [introVideoUrl, setIntroVideoUrl] = useState("")
    const [category, setCategory] = useState("")
    const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner')
    const [estimatedHours, setEstimatedHours] = useState("")
    const [students, setStudents] = useState(0)
    const [rating, setRating] = useState(0)

    // NEW FIELDS
    const [requirements, setRequirements] = useState("")
    const [skills, setSkills] = useState("")
    const [featured, setFeatured] = useState(false)
    const [isPaid, setIsPaid] = useState(false)
    const [price, setPrice] = useState('3000')

    // Lessons
    const [lessonCount, setLessonCount] = useState(0)
    const [lessons, setLessons] = useState<Lesson[]>([])

    // Build serializable draft payload
    const getDraftPayload = () => ({
        step,
        title,
        slug,
        description,
        image,
        introVideoUrl,
        category,
        level,
        estimatedHours,
        students,
        rating,
        requirements,
        skills,
        featured,
        isPaid,
        price,
        lessonCount,
        lessons,
    })

    // Determine if payload has meaningful user input
    const hasContent = (payload: any) => {
        const basicFilled = [
            payload.title,
            payload.slug,
            payload.description,
            payload.image,
            payload.introVideoUrl,
            payload.category,
            payload.estimatedHours,
            payload.requirements,
            payload.skills,
        ].some((v) => (typeof v === 'string' ? v.trim() !== '' : Boolean(v)))

        const metaFilled = (Number(payload.students) || 0) > 0 || (Number(payload.rating) || 0) > 0 || Boolean(payload.featured)

        const lessonsFilled = Array.isArray(payload.lessons) && payload.lessons.some((l: Lesson) => (
            (l.title && l.title.trim() !== '') ||
            (l.description && l.description.trim() !== '') ||
            (l.video_url && l.video_url.trim() !== '') ||
            (Number(l.time) || 0) > 0 ||
            (Array.isArray(l.topics) && l.topics.length > 0) ||
            (Array.isArray(l.downloads) && l.downloads.length > 0)
        ))

        return basicFilled || metaFilled || lessonsFilled || (Number(payload.lessonCount) || 0) > 0
    }

    // Restore from localStorage
    const restoreFromDraft = async () => {
        try {
            if (typeof window === 'undefined') return
            const applyData = (data: any) => {
                setStep(data.step ?? 1)
                setTitle(data.title ?? '')
                setSlug(data.slug ?? '')
                setDescription(data.description ?? '')
                setImage(data.image ?? '')
                setIntroVideoUrl(data.introVideoUrl ?? '')
                setCategory(data.category ?? '')
                setLevel((data.level as 'Beginner' | 'Intermediate' | 'Advanced') ?? 'Beginner')
                setEstimatedHours(data.estimatedHours ?? '')
                setStudents(Number(data.students ?? 0))
                setRating(Number(data.rating ?? 0))
                setRequirements(data.requirements ?? '')
                setSkills(data.skills ?? '')
                setFeatured(Boolean(data.featured ?? false))
                setIsPaid(Boolean(data.isPaid ?? false))
                setPrice(data.price ?? '3000')
                setLessonCount(Number(data.lessonCount ?? 0))
                setLessons(Array.isArray(data.lessons) ? data.lessons : [])
            }

            // Prefer server draft if available
            if (user && hasServerDraft) {
                const { data, error } = await supabase
                    .from('course_drafts')
                    .select('data')
                    .eq('user_id', user.id)
                    .single()
                if (!error && data?.data) {
                    applyData(data.data)
                    return
                }
            }

            // Fallback to local
            const raw = localStorage.getItem(DRAFT_KEY)
            if (!raw) return
            const data = JSON.parse(raw)
            applyData(data)
        } catch (e) {
            console.error('Failed to restore draft', e)
        }
    }

    // On mount, toggle restore button if a draft exists
    useEffect(() => {
        try {
            if (typeof window === 'undefined') return
            const raw = localStorage.getItem(DRAFT_KEY)
            setHasLocalDraft(Boolean(raw))
        } catch {
            // ignore
        }
    }, [])

    // Auto-save to localStorage when inputs change
    useEffect(() => {
        try {
            if (typeof window === 'undefined') return
            const payload = getDraftPayload()
            if (hasContent(payload)) {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
                setHasLocalDraft(true)
            } else {
                localStorage.removeItem(DRAFT_KEY)
                setHasLocalDraft(false)
            }
        } catch (e) {
            console.error('Failed to persist draft', e)
        }
    }, [
        step,
        title,
        slug,
        description,
        image,
        introVideoUrl,
        category,
        level,
        estimatedHours,
        students,
        rating,
        requirements,
        skills,
        featured,
        isPaid,
        price,
        lessonCount,
        lessons,
    ])

    // Check for server draft when user state changes
    useEffect(() => {
        const checkServer = async () => {
            if (!user || userLoading) {
                setHasServerDraft(false)
                return
            }
            const { data, error } = await supabase
                .from('course_drafts')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle()
            setHasServerDraft(Boolean(data) && !error)
        }
        checkServer()
    }, [user, userLoading])

    // Debounced server autosave for logged-in users
    useEffect(() => {
        const payload = getDraftPayload()
        if (!user || userLoading) return
        if (!hasContent(payload)) return
        const t = setTimeout(async () => {
            try {
                const { error } = await supabase
                    .from('course_drafts')
                    .upsert({
                        user_id: user.id,
                        data: payload,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' })
                if (!error) setHasServerDraft(true)
            } catch {
                // ignore
            }
        }, 1000)
        return () => clearTimeout(t)
    }, [
        user,
        userLoading,
        step,
        title,
        slug,
        description,
        image,
        introVideoUrl,
        category,
        level,
        estimatedHours,
        students,
        rating,
        requirements,
        skills,
        featured,
        isPaid,
        price,
        lessonCount,
        lessons,
    ])

    const toNext = () => setStep((s) => s + 1)
    const toPrev = () => setStep((s) => Math.max(1, s - 1))

    const initLessons = (count: number) => {
        const arr: Lesson[] = []
        for (let i = 0; i < count; i++) {
            arr.push({
                id: i + 1,
                title: '',
                time: 0,
                video: '',
                description: '',
                video_url: '',
                topics: [],
                downloads: []   // 👈 NEW
            })
        }
        setLessons(arr)
    }


    const handleLessonChange = (index: number, field: keyof Lesson, value: any) => {
        setLessons((prev) => {
            const copy = [...prev]
            // @ts-ignore
            copy[index][field] = value
            return copy
        })
    }

    const addTopic = (lessonIdx: number) => {
        setLessons(prev => {
            const copy = [...prev]
            copy[lessonIdx].topics.push({ key: "", value: "" })
            return copy
        })
    }

    const updateTopic = (lessonIdx: number, topicIdx: number, field: "key" | "value", value: string) => {
        setLessons(prev => {
            const copy = [...prev]
            copy[lessonIdx].topics[topicIdx][field] = value
            return copy
        })
    }

    const removeTopic = (lessonIdx: number, topicIdx: number) => {
        setLessons(prev => {
            const copy = [...prev]
            copy[lessonIdx].topics.splice(topicIdx, 1)
            return copy
        })
    }


    const addDownload = (lessonIdx: number) => {
        setLessons(prev => {
            const copy = [...prev]
            if (copy[lessonIdx].downloads.length >= 4) return copy

            copy[lessonIdx].downloads.push({
                title: '',
                description: '',
                file_url: '',
                file_type: '',
                file_size: 0
            })
            return copy
        })
    }

    const updateDownload = (
        lessonIdx: number,
        downloadIdx: number,
        field: keyof LessonDownload,
        value: any
    ) => {
        setLessons(prev => {
            const copy = [...prev]
            // @ts-ignore
            copy[lessonIdx].downloads[downloadIdx][field] = value
            return copy
        })
    }

    const removeDownload = (lessonIdx: number, downloadIdx: number) => {
        setLessons(prev => {
            const copy = [...prev]
            copy[lessonIdx].downloads.splice(downloadIdx, 1)
            return copy
        })
    }




    const [loading, setLoading] = useState(false)

    // Validation helpers
    const slugify = (value: string) => value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    const isValidUrl = (value?: string) => {
        if (!value) return false
        try {
            const u = new URL(value)
            return u.protocol === 'http:' || u.protocol === 'https:'
        } catch {
            return false
        }
    }

    const validateCourseInputs = () => {
        const errors: string[] = []

        const t = title.trim()
        if (t.length < 3) errors.push('Title: at least 3 characters required')

        const computedSlug = slugify(slug || t)
        if (!computedSlug) errors.push('Slug: cannot be empty (auto-generated from title if not provided)')

        if (!Array.isArray(lessons) || lessons.length < 1) {
            errors.push('Lessons: at least 1 lesson is required')
        } else {
            lessons.forEach((l, idx) => {
                const lt = (l.title || '').trim()
                if (!lt) errors.push(`Lesson ${idx + 1}: title is required`)
                if (!isValidUrl(l.video_url)) errors.push(`Lesson ${idx + 1}: video URL (http/https) is required`)
            })
        }

        return { ok: errors.length === 0, errors, computedSlug }
    }

    const handleCreateCheckCourse = async () => {
        setLoading(true)
        try {
            const coursePayload: any = {
                title: 'check check',
                slug: 'check-check-check',
                description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
                hero_image: 'https://picsum.photos/seed/check/1200/600',
                category: 'Check',
                level: 'Beginner',
                estimated_hours: 10,
                students: 0,
                rating: 5,
                requirements: 'check requirements',
                skills: 'check skills',
                featured: false,
                is_paid: isPaid,
                price: isPaid ? 3000 : null,
            }

            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .insert(coursePayload)
                .select('id, slug')
                .limit(1)

            if (courseError || !courseData || courseData.length === 0) {
                throw courseError || new Error('Failed to insert course')
            }

            const courseId = courseData[0].id

            const introSampleUrl = 'https://www.youtube.com/watch?v=8hNdFWcF2Sc'

            const { error: introError } = await supabase
                .from('course_media')
                .insert({
                    course_id: courseId,
                    type: 'intro',
                    provider: 'youtube',
                    url: introSampleUrl,
                })

            if (introError) throw introError

            const lessonsPayload = [
                {
                    course_id: courseId,
                    title: 'check check',
                    description: 'check description one',
                    estimated_time: 15,
                    step_order: 1,
                    topics: { intro: 'check', basics: 'check' },
                    video_url: 'https://www.youtube.com/watch?v=8hNdFWcF2Sc',
                },
                {
                    course_id: courseId,
                    title: 'check check',
                    description: 'check description two',
                    estimated_time: 20,
                    step_order: 2,
                    topics: { practice: 'check', summary: 'check' },
                    video_url: 'https://www.youtube.com/watch?v=8hNdFWcF2Sc',
                },
            ]

            const { data: insertedLessons, error: lessonsError } = await supabase
                .from('lessons')
                .insert(lessonsPayload)
                .select('id, step_order')

            if (lessonsError) throw lessonsError

            const downloadsPayload: any[] = []
            if (insertedLessons && insertedLessons.length > 0) {
                insertedLessons.forEach((lessonRow: any) => {
                    const lessonIndex = lessonRow.step_order - 1
                    const defaultDownload = {
                        lesson_id: lessonRow.id,
                        title: 'check download',
                        description: 'check file for lesson',
                        file_url: 'https://example.com/check.pdf',
                        file_type: 'pdf',
                        file_size: 1024,
                    }
                    downloadsPayload.push(defaultDownload)
                })
            }

            if (downloadsPayload.length > 0) {
                const { error: downloadsError } = await supabase
                    .from('lesson_downloads')
                    .insert(downloadsPayload)
                if (downloadsError) throw downloadsError
            }

            toast({ title: 'Check course created', description: 'Created course "check check" with sample lessons.' })
        } catch (err: any) {
            toast({ title: 'Error', description: err?.message || 'Unable to create check course.' })
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        setLoading(true)

        // Validate required inputs before saving
        const { ok, errors, computedSlug } = validateCourseInputs()
        if (!ok) {
            toast({ title: 'Missing required information', description: errors.join('\n') })
            setLoading(false)
            return
        }

        try {
            const parsedPrice = price.trim() === '' ? 3000 : Number(price)
            if (isPaid && (!Number.isFinite(parsedPrice) || parsedPrice <= 0)) {
                toast({ title: 'Invalid price', description: 'Paid course price must be a positive number.' })
                setLoading(false)
                return
            }

            const coursePayload: any = {
                title,
                slug: computedSlug,
                description,
                hero_image: image,
                category,
                level,
                estimated_hours: Number(estimatedHours) || null,
                students: Number(students) || 0,
                rating: Number(rating) || 0,

                // NEW FIELDS
                requirements,
                skills,
                featured,
                is_paid: Boolean(isPaid),
                price: Boolean(isPaid) ? parsedPrice : null,
            }

            // Insert course
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .insert(coursePayload)
                .select('id, slug')
                .limit(1)

            if (courseError || !courseData || courseData.length === 0) {
                throw courseError || new Error('Failed to insert course')
            }

            const courseId = courseData[0].id

            const trimmedIntro = introVideoUrl.trim()
            if (trimmedIntro) {
                const { error: introError } = await supabase
                    .from('course_media')
                    .insert({
                        course_id: courseId,
                        type: 'intro',
                        provider: 'youtube',
                        url: trimmedIntro,
                    })

                if (introError) throw introError
            }


            // Prepare lessons
            const lessonsPayload = lessons.map((l, idx) => {
                const topicObject: Record<string, string> = {}
                l.topics.forEach(t => {
                    if (t.key.trim() !== "") {
                        topicObject[t.key] = t.value
                    }
                })

                return {
                    course_id: courseId,
                    title: l.title,
                    description: l.description,
                    estimated_time: Number(l.time) || null,
                    step_order: idx + 1,
                    topics: topicObject,
                    video_url: l.video_url
                }
            })

            // Insert lessons and RETURN their IDs
            const { data: insertedLessons, error: lessonsError } = await supabase
                .from('lessons')
                .insert(lessonsPayload)
                .select('id, step_order')

            if (lessonsError) throw lessonsError
            if (!insertedLessons) throw new Error("No lessons returned from insert")


            const downloadsPayload: any[] = []

            insertedLessons.forEach((lessonRow) => {
                if (lessonRow.step_order == null) {
                    return
                }

                // Convert step_order → array index
                const lessonIndex = lessonRow.step_order - 1

                if (!lessons[lessonIndex]) {
                    return
                }

                // Downloads entered in the UI for this lesson
                const lessonDownloads = lessons[lessonIndex].downloads

                lessonDownloads.forEach(d => {
                    downloadsPayload.push({
                        lesson_id: lessonRow.id,   // 🔥 THIS IS THE KEY PART
                        title: d.title,
                        description: d.description || null,
                        file_url: d.file_url,
                        file_type: d.file_type,
                        file_size: d.file_size
                    })
                })
            })

            if (downloadsPayload.length > 0) {
                const { error: downloadsError } = await supabase
                    .from('lesson_downloads')
                    .insert(downloadsPayload)

                if (downloadsError) throw downloadsError
            }

            // Clear saved drafts on successful creation (local + server)
            try {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem(DRAFT_KEY)
                    setHasLocalDraft(false)
                }
                if (user) {
                    await supabase
                        .from('course_drafts')
                        .delete()
                        .eq('user_id', user.id)
                    setHasServerDraft(false)
                }
            } catch {
                // ignore
            }

            toast({ title: 'Course created', description: `${title} was added successfully.` })
            setTimeout(() => router.push('/admin/courses'), 500)
        } catch (err: any) {
            toast({ title: 'Error', description: err?.message || 'Unable to save course.' })
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-4 md:p-8">
            <Card className="max-w-4xl mx-auto bg-card shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-xl">Add New Course</CardTitle>
                            <CardDescription>Follow the steps to add a complete course with lessons.</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                            <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={restoreFromDraft} disabled={!(hasLocalDraft || hasServerDraft)}>
                                Fill Last Input
                            </Button>
                            {user?.user_metadata?.role === 'admin' && (
                                <Button
                                    className="w-full sm:w-auto"
                                    type="button"
                                    variant="ghost"
                                    onClick={async () => {
                                        try {
                                            if (user) {
                                                await supabase
                                                    .from('course_drafts')
                                                    .delete()
                                                    .eq('user_id', user.id)
                                                setHasServerDraft(false)
                                                toast({ title: 'Draft cleared' })
                                            }
                                        } catch {
                                            toast({ title: 'Error', description: 'Failed to clear draft' })
                                        }
                                    }}
                                    disabled={!hasServerDraft}
                                >
                                    Clear Draft
                                </Button>
                            )}
                            <Button className="w-full sm:w-auto" type="button" variant="secondary" onClick={handleCreateCheckCourse} disabled={loading}>
                                {loading ? 'Working…' : 'Create Check Course'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-0">
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-5">

                            {/* STEP INDICATOR */}
                            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-muted/30 p-2 sm:gap-3">
                                {[1, 2, 3, 4].map((n) => (
                                    <div
                                        key={n}
                                        className={`rounded-lg px-3 py-1 text-sm ${step === n ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                                    >
                                        {n}
                                    </div>
                                ))}
                            </div>

                            {/* STEP 1 - COURSE MAIN INFO */}
                            {step === 1 && (
                                <div className="space-y-4">

                                    <div>
                                        <Label>Title</Label>
                                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title" />
                                    </div>

                                    <div>
                                        <Label>Slug (optional)</Label>
                                        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="course-slug" />
                                    </div>

                                    <div>
                                        <Label>Description</Label>
                                        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
                                    </div>

                                    <div>
                                        <Label>Image URL</Label>
                                        <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="Image URL" />
                                    </div>

                                    <div>
                                        <Label>Intro Video URL (YouTube)</Label>
                                        <Input
                                            value={introVideoUrl}
                                            onChange={(e) => setIntroVideoUrl(e.target.value)}
                                            placeholder="https://www.youtube.com/watch?v=..."
                                        />
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1">
                                            <Label>Category</Label>
                                            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
                                        </div>

                                        <div className="w-full md:w-1/3">
                                            <Label>Level</Label>
                                            <Select defaultValue={level} onValueChange={(v) => setLevel(v as any)}>
                                                <SelectTrigger><SelectValue>{level}</SelectValue></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Beginner">Beginner</SelectItem>
                                                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                                                    <SelectItem value="Advanced">Advanced</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* NEW FIELDS */}
                                    <div>
                                        <Label>Requirements</Label>
                                        <Input value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="Basic computer skills" />
                                    </div>

                                    <div>
                                        <Label>Skills</Label>
                                        <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="SEO, Analytics..." />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Checkbox checked={featured} onCheckedChange={(v) => setFeatured(Boolean(v))} />
                                        <Label>Featured Course</Label>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Checkbox checked={isPaid} onCheckedChange={(v) => setIsPaid(Boolean(v))} />
                                        <Label>Paid Course</Label>
                                    </div>

                                    {isPaid && (
                                        <div>
                                            <Label>Price (ETB)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                placeholder="3000"
                                            />
                                        </div>
                                    )}

                                    <div className="flex justify-end">
                                        <Button type="button" onClick={toNext}>Next</Button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2 - META */}
                            {step === 2 && (
                                <div className="space-y-4">

                                    <div>
                                        <Label>Estimated Hours</Label>
                                        <Input value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} placeholder="e.g. 50" />
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1">
                                            <Label>Students</Label>
                                            <Input type="number" value={students} onChange={(e) => setStudents(Number(e.target.value))} />
                                        </div>

                                        <div className="w-full md:w-1/3">
                                            <Label>Rating</Label>
                                            <Input type="number" step="0.1" value={rating} onChange={(e) => setRating(Number(e.target.value))} />
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <Button type="button" variant="outline" onClick={toPrev}>Back</Button>
                                        <Button type="button" onClick={toNext}>Next</Button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3 - LESSON COUNT */}
                            {step === 3 && (
                                <div className="space-y-4">

                                    <div>
                                        <Label>How many lessons?</Label>
                                        <Input type="number" value={lessonCount} onChange={(e) => setLessonCount(Number(e.target.value))} />
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <Button type="button" variant="outline" onClick={toPrev}>Back</Button>
                                        <Button type="button" onClick={() => { initLessons(lessonCount); toNext(); }}>
                                            Create Lessons
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4 - LESSON DETAIL ENTRY */}
                            {step === 4 && (
                                <div className="space-y-6">

                                    {lessons.map((lesson, idx) => (
                                        <div key={lesson.id} className="rounded-2xl border border-border/70 p-4 shadow-sm">

                                            <div>
                                                <Label>Lesson {lesson.id} Title</Label>
                                                <Input value={lesson.title} onChange={(e) => handleLessonChange(idx, "title", e.target.value)} />
                                            </div>

                                            <div className="mt-2">
                                                <Label>Description</Label>
                                                <Input value={lesson.description} onChange={(e) => handleLessonChange(idx, "description", e.target.value)} />
                                            </div>

                                            <div className="flex flex-col md:flex-row gap-4 mt-2">

                                                <div className="w-full md:w-1/3">
                                                    <Label>Time (minutes)</Label>
                                                    <Input type="number" value={lesson.time} onChange={(e) => handleLessonChange(idx, "time", Number(e.target.value))} />
                                                </div>

                                                <div className="flex-1">
                                                    <Label>Video URL</Label>
                                                    <Input value={lesson.video_url} onChange={(e) => handleLessonChange(idx, "video_url", e.target.value)} placeholder="https://..." />
                                                </div>
                                            </div>

                                            {/* TOPICS */}
                                            <div className="mt-4">
                                                <Label className="font-bold">Topics</Label>

                                                {lesson.topics.map((t, tdx) => (
                                                    <div key={tdx} className="flex flex-col md:flex-row gap-2 mt-2">

                                                        <Input
                                                            className="w-full md:w-1/3"
                                                            value={t.key}
                                                            placeholder="Topic Key"
                                                            onChange={(e) => updateTopic(idx, tdx, "key", e.target.value)}
                                                        />

                                                        <Input
                                                            className="flex-1"
                                                            value={t.value}
                                                            placeholder="Topic Description"
                                                            onChange={(e) => updateTopic(idx, tdx, "value", e.target.value)}
                                                        />

                                                        <Button variant="destructive" type="button" onClick={() => removeTopic(idx, tdx)}>
                                                            X
                                                        </Button>
                                                    </div>
                                                ))}

                                                <Button type="button" variant="secondary" className="mt-2" onClick={() => addTopic(idx)}>
                                                    Add Topic
                                                </Button>
                                            </div>


                                            {/* DOWNLOADS */}
                                            <div className="mt-6">
                                                <Label className="font-bold">Downloads</Label>

                                                {lesson.downloads.map((d, ddx) => (
                                                    <div key={ddx} className="mt-3 p-3 border rounded space-y-2">

                                                        <div>
                                                            <Label>Title</Label>
                                                            <Input
                                                                value={d.title}
                                                                onChange={(e) =>
                                                                    updateDownload(idx, ddx, "title", e.target.value)
                                                                }
                                                            />
                                                        </div>

                                                        <div>
                                                            <Label>Description (optional)</Label>
                                                            <Input
                                                                value={d.description}
                                                                onChange={(e) =>
                                                                    updateDownload(idx, ddx, "description", e.target.value)
                                                                }
                                                            />
                                                        </div>

                                                        <div>
                                                            <Label>File URL</Label>
                                                            <Input
                                                                value={d.file_url}
                                                                placeholder="https://drive.google.com/..."
                                                                onChange={(e) =>
                                                                    updateDownload(idx, ddx, "file_url", e.target.value)
                                                                }
                                                            />
                                                        </div>

                                                        <div className="flex flex-col md:flex-row gap-3">
                                                            <div className="flex-1">
                                                                <Label>File Type</Label>
                                                                <Input
                                                                    value={d.file_type}
                                                                    placeholder="pdf, zip, docx"
                                                                    onChange={(e) =>
                                                                        updateDownload(idx, ddx, "file_type", e.target.value)
                                                                    }
                                                                />
                                                            </div>

                                                            <div className="w-full md:w-1/3">
                                                                <Label>File Size</Label>
                                                                <Input
                                                                    type="number"
                                                                    placeholder="KB or MB"
                                                                    value={d.file_size}
                                                                    onChange={(e) =>
                                                                        updateDownload(idx, ddx, "file_size", Number(e.target.value))
                                                                    }
                                                                />
                                                            </div>
                                                        </div>

                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            onClick={() => removeDownload(idx, ddx)}
                                                        >
                                                            Remove Download
                                                        </Button>
                                                    </div>
                                                ))}

                                                {lesson.downloads.length < 4 && (
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        className="mt-3"
                                                        onClick={() => addDownload(idx)}
                                                    >
                                                        Add Download
                                                    </Button>
                                                )}
                                            </div>


                                        </div>
                                    ))}

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <Button type="button" variant="outline" onClick={toPrev}>Back</Button>
                                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                            <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={() => setStep(1)}>Edit Start</Button>
                                            <Button className="w-full sm:w-auto" type="submit" disabled={loading}>
                                                {loading ? "Saving..." : "Save Course"}
                                            </Button>
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    </form>
                </CardContent>

            </Card>
        </div>
    )
}
