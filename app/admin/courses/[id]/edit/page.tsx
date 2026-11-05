"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
import { useToast } from '@/hooks/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronRight } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

type TopicItem = { key: string; value: string }

type LessonDownload = {
    id?: number | null
    title: string
    description: string
    file_url: string
    file_type: string
    file_size: number | null
}


export default function EditCoursePage() {
    const params = useParams() as { id: string }
    const id = Number(params?.id)
    const router = useRouter()
    const { toast } = useToast()

    const [loading, setLoading] = useState(false)
    const [course, setCourse] = useState<any>(null)
    const [lessons, setLessons] = useState<any[]>([])
    const [lessonOpen, setLessonOpen] = useState<Record<string, boolean>>({})
    const [reviewNotes, setReviewNotes] = useState<Array<{ id: string; content: string; status: string; created_at: string; reviewer_id?: string | null; addressed?: boolean | null }>>([])

    // course fields
    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [description, setDescription] = useState('')
    const [image, setImage] = useState('')
    const [category, setCategory] = useState('')
    const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner')
    const [estimatedHours, setEstimatedHours] = useState('')
    const [requirements, setRequirements] = useState('')
    const [skills, setSkills] = useState('')
    const [featured, setFeatured] = useState(false)
    const [isPaid, setIsPaid] = useState(false)
    const [price, setPrice] = useState('3000')
    const [students, setStudents] = useState<number | ''>('')
    const [rating, setRating] = useState<number | ''>('')
    const [introVideoUrl, setIntroVideoUrl] = useState('')
    const [introMediaId, setIntroMediaId] = useState<number | null>(null)
    const [deletedLessonIds, setDeletedLessonIds] = useState<number[]>([])
    const [deleteLessonIdx, setDeleteLessonIdx] = useState<number | null>(null)
    const [deleteLessonInput, setDeleteLessonInput] = useState('')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    const getLessonKey = (lesson: any, fallbackIndex?: number) => {
        if (lesson?.id) return String(lesson.id)
        if (lesson?.clientKey) return String(lesson.clientKey)
        return `new-${fallbackIndex ?? 0}`
    }

    const computeOpenState = (list: any[], prev: Record<string, boolean>, forceOpenKey?: string) => {
        const next: Record<string, boolean> = {}
        list.forEach((lesson, idx) => {
            const key = getLessonKey(lesson, idx)
            next[key] = forceOpenKey === key ? true : (prev[key] ?? idx === 0)
        })
        return next
    }

    const getLessonDisplayTitle = (lesson: any, index: number) => {
        const base = lesson?.title?.trim()
        return base && base.length > 0 ? base : `Lesson ${index + 1}`
    }

    useEffect(() => {
        if (!id) return
        const load = async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/admin/courses/${id}`, { cache: 'no-store' })
                const data = await res.json()
                if (!res.ok) {
                    toast({ title: 'Error', description: data?.error || 'Failed to load course' })
                    setLoading(false)
                    return
                }

                const courseData = data.course
                const lessonsData = data.lessons || []
                const notesData = data.reviewNotes || []
                const introMedia = data.introMedia

                setCourse(courseData)
                setReviewNotes(notesData || [])

                const normalizedLessons = (lessonsData || []).map((l: any) => {
                    let topicsArr: TopicItem[] = []
                    if (l.topics) {
                        try {
                            const topicsObj = typeof l.topics === 'string' ? JSON.parse(l.topics) : l.topics
                            if (topicsObj && typeof topicsObj === 'object' && !Array.isArray(topicsObj)) {
                                topicsArr = Object.entries(topicsObj).map(([k, v]) => ({ key: k, value: String(v) }))
                            }
                        } catch (e) {
                            topicsArr = []
                        }
                    }
                    return {
                        ...l,
                        clientKey: `lesson-${l.id}`,
                        title: l.title ?? '',
                        description: l.description ?? '',
                        estimated_time: l.estimated_time ?? null,
                        step_order: l.step_order ?? null,
                        video_url: l.video_url ?? (l.topics?.video ?? null),
                        topicsArr,
                        downloads: (l.lesson_downloads || l.downloads || []).map((d: any) => ({
                            id: d.id,
                            title: d.title ?? '',
                            description: d.description ?? '',
                            file_url: d.file_url ?? '',
                            file_type: d.file_type ?? '',
                            file_size: d.file_size ?? null,
                        })),
                    }
                })

                setLessons(normalizedLessons)
                setLessonOpen(prev => computeOpenState(normalizedLessons, prev))

                setTitle(courseData.title ?? '')
                setSlug(courseData.slug ?? '')
                setDescription(courseData.description ?? '')
                setImage(courseData.hero_image ?? '')
                setCategory(courseData.category ?? '')
                const nextLevel = (courseData.level === 'Beginner' || courseData.level === 'Intermediate' || courseData.level === 'Advanced')
                    ? courseData.level
                    : 'Beginner'
                setLevel(nextLevel)
                setEstimatedHours(courseData.estimated_hours ? String(courseData.estimated_hours) : '')
                setRequirements(courseData.requirements ?? '')
                setSkills(courseData.skills ?? '')
                setFeatured(Boolean(courseData.featured))
                setIsPaid(Boolean(courseData.is_paid))
                setPrice(courseData.price === null || courseData.price === undefined ? '3000' : String(courseData.price))
                setStudents(courseData.students ?? 0)
                setRating(courseData.rating ?? 0)

                if (introMedia) {
                    setIntroVideoUrl(introMedia.url ?? '')
                    setIntroMediaId(introMedia.id ?? null)
                }
            } catch (err: any) {
                toast({ title: 'Error', description: err.message })
            } finally {
                setLoading(false)
            }
        }

        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const handleLessonChange = (index: number, field: string, value: any) => {
        setLessons((prev) => {
            const copy = [...prev]
            copy[index] = { ...copy[index], [field]: value }
            return copy
        })
    }
    //Downloads helpers

    const addDownload = (lessonIdx: number) => {
        setLessons(prev => {
            const copy = [...prev]
            const downloads = copy[lessonIdx].downloads
                ? [...copy[lessonIdx].downloads]
                : []

            downloads.push({
                id: null,
                title: '',
                description: '',
                file_url: '',
                file_type: '',
                file_size: null,
            })

            copy[lessonIdx] = { ...copy[lessonIdx], downloads }
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
            const downloads = [...copy[lessonIdx].downloads]
            downloads[downloadIdx] = { ...downloads[downloadIdx], [field]: value }
            copy[lessonIdx] = { ...copy[lessonIdx], downloads }
            return copy
        })
    }

    const removeDownload = (lessonIdx: number, downloadIdx: number) => {
        setLessons(prev => {
            const copy = [...prev]
            const downloads = [...copy[lessonIdx].downloads]
            downloads.splice(downloadIdx, 1)
            copy[lessonIdx] = { ...copy[lessonIdx], downloads }
            return copy
        })
    }


    // Topics helpers
    const addTopic = (lessonIdx: number) => {
        setLessons(prev => {
            const copy = [...prev]
            const arr = Array.isArray(copy[lessonIdx].topicsArr) ? copy[lessonIdx].topicsArr.slice() : []
            arr.push({ key: '', value: '' })
            copy[lessonIdx] = { ...copy[lessonIdx], topicsArr: arr }
            return copy
        })
    }

    const updateTopic = (lessonIdx: number, topicIdx: number, field: 'key' | 'value', value: string) => {
        setLessons(prev => {
            const copy = [...prev]
            const arr = copy[lessonIdx].topicsArr ? [...copy[lessonIdx].topicsArr] : []
            arr[topicIdx] = { ...arr[topicIdx], [field]: value }
            copy[lessonIdx] = { ...copy[lessonIdx], topicsArr: arr }
            return copy
        })
    }

    const removeTopic = (lessonIdx: number, topicIdx: number) => {
        setLessons(prev => {
            const copy = [...prev]
            const arr = copy[lessonIdx].topicsArr ? [...copy[lessonIdx].topicsArr] : []
            arr.splice(topicIdx, 1)
            copy[lessonIdx] = { ...copy[lessonIdx], topicsArr: arr }
            return copy
        })
    }

    const addNewLesson = () => {
        setLessons(prev => {
            const copy = [...prev]
            const newLesson = {
                id: null,
                title: '',
                description: '',
                estimated_time: null,
                step_order: (copy.length ?? 0) + 1,
                topicsArr: [],
                video_url: null,
                clientKey: `new-${Date.now()}`,
            }
            copy.push(newLesson)
            setLessonOpen(openPrev => computeOpenState(copy, openPrev, getLessonKey(newLesson, copy.length - 1)))
            return copy
        })
    }

    const performLessonDeletion = (index: number) => {
        const l = lessons[index]
        if (l?.id) {
            setDeletedLessonIds(prev => [...prev, l.id])
        }
        setLessons(prev => {
            const updated = prev.filter((_, i) => i !== index)
            setLessonOpen(openPrev => computeOpenState(updated, openPrev))
            return updated
        })
        toast({ title: 'Lesson removed', description: 'Click Save Changes to persist changes.' })
    }

    const openDeleteDialog = (index: number) => {
        setDeleteLessonIdx(index)
        setDeleteLessonInput('')
        setDeleteDialogOpen(true)
    }

    const confirmDeleteLesson = () => {
        if (deleteLessonIdx === null) return
        performLessonDeletion(deleteLessonIdx)
        setDeleteDialogOpen(false)
        setDeleteLessonIdx(null)
        setDeleteLessonInput('')
    }

    const handleSave = async (e?: React.FormEvent) => {
        e?.preventDefault()

        const confirmed = confirm('Save changes to course and lessons?')
        if (!confirmed) return

        setLoading(true)
        try {
            const parsedPrice = price.trim() === '' ? 3000 : Number(price)
            if (isPaid && (!Number.isFinite(parsedPrice) || parsedPrice <= 0)) {
                toast({ title: 'Invalid price', description: 'Paid course price must be a positive number.' })
                setLoading(false)
                return
            }

            const payload = {
                title,
                slug,
                description,
                hero_image: image,
                category,
                level,
                estimated_hours: estimatedHours ? Number(estimatedHours) : null,
                requirements: requirements || null,
                skills: skills || null,
                featured: Boolean(featured),
                is_paid: Boolean(isPaid),
                price: Boolean(isPaid) ? parsedPrice : null,
                students: students ? Number(students) : 0,
                rating: rating ? Number(rating) : 0,
                introVideoUrl: introVideoUrl.trim(),
                lessons: lessons.map(l => {
                    const topicsObj: Record<string, string> = {}
                    if (Array.isArray(l.topicsArr)) {
                        l.topicsArr.forEach((t: TopicItem) => {
                            if (t.key && t.key.trim() !== '') {
                                topicsObj[t.key] = t.value ?? ''
                            }
                        })
                    } else if (l.topics && typeof l.topics === 'object' && !Array.isArray(l.topics)) {
                        Object.assign(topicsObj, l.topics)
                    }
                    return {
                        id: l.id,
                        title: l.title ?? '',
                        description: l.description ?? null,
                        estimated_time: l.estimated_time ? Number(l.estimated_time) : null,
                        step_order: l.step_order ? Number(l.step_order) : null,
                        topics: Object.keys(topicsObj).length > 0 ? topicsObj : null,
                        video_url: l.video_url ?? null,
                        downloads: l.downloads ?? [],
                    }
                }),
                deletedLessonIds,
            }

            const res = await fetch(`/api/admin/courses/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const resJson = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(resJson?.error || 'Failed to update course')
            }

            toast({ title: 'Saved', description: 'Course updated.' })
            router.push('/admin/courses')
        } catch (err: any) {
            toast({ title: 'Error', description: err?.message || 'Failed to save course.' })
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (!course) return (
        <div className="p-4 md:p-8">
            <Card className="bg-card max-w-4xl mx-auto">
                <CardContent>Loading...</CardContent>
            </Card>
        </div>
    )

    const expectedDeleteTitle = deleteLessonIdx !== null ? getLessonDisplayTitle(lessons[deleteLessonIdx], deleteLessonIdx) : ''
    const deleteDisabled = !expectedDeleteTitle || expectedDeleteTitle.toLowerCase() !== deleteLessonInput.trim().toLowerCase()

    return (
        <div className="p-4 md:p-8">
            <Card className="max-w-4xl mx-auto bg-card shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xl">Edit Course</CardTitle>
                    <CardDescription>Update course and lesson details.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    {reviewNotes.length > 0 && (
                        <div className="mb-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Reviewer feedback</p>
                                    <div className="text-sm text-muted-foreground">{reviewNotes.length} note{reviewNotes.length === 1 ? '' : 's'}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100">
                                        {reviewNotes.filter(n => n.addressed || n.status === 'resolved').length} addressed
                                    </Badge>
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                                        {reviewNotes.filter(n => !(n.addressed || n.status === 'resolved')).length} open
                                    </Badge>
                                </div>
                            </div>

                            <Card className="border-muted shadow-sm">
                                <CardContent className="p-0">
                                    <ScrollArea className="max-h-64">
                                        <div className="divide-y divide-border">
                                            {reviewNotes.map((n) => {
                                                const isAddressed = n.addressed || n.status === 'resolved'
                                                const statusTone = isAddressed
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100'
                                                    : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
                                                const initial = n.reviewer_id ? n.reviewer_id.slice(0, 2).toUpperCase() : 'RV'
                                                return (
                                                    <div key={n.id} className="flex gap-3 p-3">
                                                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                                                            {initial}
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="secondary" className={statusTone}>{isAddressed ? 'addressed' : 'open'}</Badge>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {new Date(n.created_at).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm leading-relaxed text-foreground">{n.content}</p>
                                                            <div className="flex gap-2 pt-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant={isAddressed ? 'outline' : 'secondary'}
                                                                    className="h-8 px-3"
                                                                    onClick={async () => {
                                                                        const next = !isAddressed
                                                                        try {
                                                                            const res = await fetch(`/api/admin/courses/${id}`, {
                                                                                method: 'PATCH',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({ noteId: n.id, addressed: next }),
                                                                            })
                                                                            if (!res.ok) {
                                                                                toast({ title: 'Update failed', description: 'Failed to update note' })
                                                                            } else {
                                                                                setReviewNotes((prev) => prev.map((x) => x.id === n.id ? { ...x, addressed: next, status: next ? 'resolved' : 'open' } : x))
                                                                            }
                                                                        } catch (e: any) {
                                                                            toast({ title: 'Update failed', description: e.message })
                                                                        }
                                                                    }}
                                                                >
                                                                    {isAddressed ? 'Mark open' : 'Mark addressed'}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <form onSubmit={handleSave} className="space-y-5">

                        {/* Course fields */}
                        <div>
                            <Label>Title</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>

                        <div>
                            <Label>Slug</Label>
                            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
                        </div>

                        <div>
                            <Label>Description</Label>
                            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>

                        <div>
                            <Label>Hero Image URL</Label>
                            <Input value={image} onChange={(e) => setImage(e.target.value)} />
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
                                <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                            </div>
                            <div className="w-full md:w-1/3">
                                <Label>Level</Label>
                                <Select defaultValue={level} onValueChange={(v) => setLevel(v as any)}>
                                    <SelectTrigger>
                                        <SelectValue>{level}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Beginner">Beginner</SelectItem>
                                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                                        <SelectItem value="Advanced">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label>Requirements</Label>
                            <Input value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="e.g. Basic computer skills" />
                        </div>

                        <div>
                            <Label>Skills</Label>
                            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. SEO, Analytics" />
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <Label>Estimated Hours</Label>
                                <Input value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
                            </div>

                            <div className="w-full md:w-1/3">
                                <Label>Featured</Label>
                                <div className="flex items-center gap-2">
                                    <Checkbox checked={featured} onCheckedChange={(v) => setFeatured(Boolean(v))} />
                                    <span>{featured ? 'Yes' : 'No'}</span>
                                </div>
                            </div>
                            <div className="w-full md:w-1/3">
                                <Label>Paid</Label>
                                <div className="flex items-center gap-2">
                                    <Checkbox checked={isPaid} onCheckedChange={(v) => setIsPaid(Boolean(v))} />
                                    <span>{isPaid ? 'Yes' : 'No'}</span>
                                </div>
                            </div>
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
                                />
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <Label>Students</Label>
                                <Input type="number" value={students ?? ''} onChange={(e) => setStudents(e.target.value === '' ? '' : Number(e.target.value))} />
                            </div>
                            <div className="w-full md:w-1/3">
                                <Label>Rating</Label>
                                <Input type="number" step="0.1" value={rating ?? ''} onChange={(e) => setRating(e.target.value === '' ? '' : Number(e.target.value))} />
                            </div>
                        </div>

                        {/* Lessons editor */}
                        <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <h4 className="font-medium">Lessons</h4>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={addNewLesson}>Add Lesson</Button>
                                </div>
                            </div>

                            {lessons.map((l, i) => {
                                const lessonKey = getLessonKey(l, i)
                                const isOpen = lessonOpen[lessonKey] ?? false

                                return (
                                    <Collapsible
                                        key={lessonKey}
                                        open={isOpen}
                                        onOpenChange={(open) => setLessonOpen(prev => ({ ...prev, [lessonKey]: open }))}
                                    >
                                        <div className="rounded-2xl border border-border/70 p-3 space-y-2 shadow-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <CollapsibleTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="flex items-center gap-2 text-left focus:outline-none"
                                                    >
                                                        <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                                        <span className="font-medium">{getLessonDisplayTitle(l, i)}</span>
                                                        <span className="text-xs text-muted-foreground">ID: {l.id ?? 'new'}</span>
                                                    </button>
                                                </CollapsibleTrigger>

                                                <div className="flex flex-wrap gap-2">
                                                    <Button type="button" variant="ghost" onClick={() => {
                                                        if (i === 0) return
                                                        setLessons(prev => {
                                                            const copy = [...prev]
                                                            const tmp = copy[i - 1]
                                                            copy[i - 1] = copy[i]
                                                            copy[i] = tmp
                                                            return copy
                                                        })
                                                    }}>Move Up</Button>

                                                    <Button type="button" variant="ghost" onClick={() => {
                                                        if (i === lessons.length - 1) return
                                                        setLessons(prev => {
                                                            const copy = [...prev]
                                                            const tmp = copy[i + 1]
                                                            copy[i + 1] = copy[i]
                                                            copy[i] = tmp
                                                            return copy
                                                        })
                                                    }}>Move Down</Button>

                                                    <Button type="button" variant="destructive" onClick={() => openDeleteDialog(i)}>Delete</Button>
                                                </div>
                                            </div>

                                            <CollapsibleContent className="space-y-2 pt-2">
                                                <div>
                                                    <Label>Title</Label>
                                                    <Input value={l.title} onChange={(e) => handleLessonChange(i, 'title', e.target.value)} />
                                                </div>

                                                <div>
                                                    <Label>Description</Label>
                                                    <Input value={l.description} onChange={(e) => handleLessonChange(i, 'description', e.target.value)} />
                                                </div>

                                                <div className="flex flex-col md:flex-row gap-4">
                                                    <div className="w-full md:w-1/4">
                                                        <Label>Step Order</Label>
                                                        <Input type="number" value={l.step_order ?? ''} onChange={(e) => handleLessonChange(i, 'step_order', e.target.value === '' ? null : Number(e.target.value))} />
                                                    </div>

                                                    <div className="w-full md:w-1/4">
                                                        <Label>Time (minutes)</Label>
                                                        <Input type="number" value={l.estimated_time ?? ''} onChange={(e) => handleLessonChange(i, 'estimated_time', e.target.value === '' ? null : Number(e.target.value))} />
                                                    </div>

                                                    <div className="flex-1">
                                                        <Label>Video URL</Label>
                                                        <Input value={l.video_url ?? ''} onChange={(e) => handleLessonChange(i, 'video_url', e.target.value)} />
                                                    </div>
                                                </div>

                                                {/* Topics editor */}
                                                <div className="mt-2">
                                                    <Label>Topics (key → value)</Label>
                                                    <div className="space-y-2">
                                                        {(l.topicsArr ?? []).map((t: TopicItem, tIdx: number) => (
                                                            <div key={tIdx} className="flex flex-col md:flex-row gap-2 items-start">
                                                                <Input placeholder="Topic Key" className="w-full md:w-1/3" value={t.key} onChange={(e) => updateTopic(i, tIdx, 'key', e.target.value)} />
                                                                <Input placeholder="Topic Description" className="flex-1" value={t.value} onChange={(e) => updateTopic(i, tIdx, 'value', e.target.value)} />
                                                                <Button type="button" variant="destructive" onClick={() => removeTopic(i, tIdx)}>X</Button>
                                                            </div>
                                                        ))}

                                                        <Button type="button" variant="secondary" onClick={() => addTopic(i)}>Add Topic</Button>
                                                    </div>
                                                </div>

                                                {/* Downloads editor */}
                                                <div className="mt-4">
                                                    <Label>Downloadable Files</Label>

                                                    <div className="space-y-3 mt-2">
                                                        {(l.downloads ?? []).map((d: LessonDownload, dIdx: number) => (
                                                            <div key={d.id ?? `new-d-${dIdx}`} className="p-3 border rounded space-y-2">

                                                                <div className="flex flex-col md:flex-row gap-2">
                                                                    <div className="flex-1">
                                                                        <Label>Title</Label>
                                                                        <Input
                                                                            value={d.title}
                                                                            onChange={e => updateDownload(i, dIdx, 'title', e.target.value)}
                                                                        />
                                                                    </div>

                                                                    <div className="w-full md:w-1/4">
                                                                        <Label>File Type</Label>
                                                                        <Input
                                                                            placeholder="pdf, zip, docx"
                                                                            value={d.file_type}
                                                                            onChange={e => updateDownload(i, dIdx, 'file_type', e.target.value)}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <Label>Description</Label>
                                                                    <Input
                                                                        value={d.description}
                                                                        onChange={e => updateDownload(i, dIdx, 'description', e.target.value)}
                                                                    />
                                                                </div>

                                                                <div className="flex flex-col md:flex-row gap-2">
                                                                    <div className="flex-1">
                                                                        <Label>File URL</Label>
                                                                        <Input
                                                                            value={d.file_url}
                                                                            onChange={e => updateDownload(i, dIdx, 'file_url', e.target.value)}
                                                                        />
                                                                    </div>

                                                                    <div className="w-full md:w-1/4">
                                                                        <Label>File Size (KB)</Label>
                                                                        <Input
                                                                            type="number"
                                                                            value={d.file_size ?? ''}
                                                                            onChange={e =>
                                                                                updateDownload(
                                                                                    i,
                                                                                    dIdx,
                                                                                    'file_size',
                                                                                    e.target.value === '' ? null : Number(e.target.value)
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    onClick={() => removeDownload(i, dIdx)}
                                                                >
                                                                    Remove Download
                                                                </Button>
                                                            </div>
                                                        ))}

                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => addDownload(i)}
                                                        >
                                                            Add Download
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CollapsibleContent>

                                        </div>
                                    </Collapsible>
                                )
                            })}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
                            <Button className="w-full sm:w-auto" variant="outline" onClick={() => router.push('/admin/courses')}>Cancel</Button>
                            <Button className="w-full sm:w-auto" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                    setDeleteDialogOpen(open)
                    if (!open) {
                        setDeleteLessonIdx(null)
                        setDeleteLessonInput('')
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete lesson</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. Type the lesson title to confirm.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                        <Label>Lesson Title Confirmation</Label>
                        <Input
                            value={deleteLessonInput}
                            onChange={(e) => setDeleteLessonInput(e.target.value)}
                            placeholder="Enter lesson title"
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleteDisabled}
                            onClick={confirmDeleteLesson}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
