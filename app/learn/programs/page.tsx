"use client"

import { useEffect, useMemo, useState } from "react"
import TransitionLink from "@/components/transition-link"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Layers, Search } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

interface ProgramCourseRow {
    is_required: boolean | null
}

interface ProgramListItem {
    id: string
    title: string
    slug: string
    description: string | null
    status: string
    thumbnail: string | null
    price: number | null
    program_courses: ProgramCourseRow[] | null
}

const formatPrice = (value: number | null) => {
    if (value === null) return "Free"
    if (value === 0) return "$0"
    return `$${value}`
}

export default function ProgramsPage() {
    const { t } = useLanguage()
    const [programs, setPrograms] = useState<ProgramListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        const loadPrograms = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from("programs")
                .select("id, title, slug, description, status, thumbnail, price, program_courses(is_required)")
                .eq("status", "published")
                .order("created_at", { ascending: false })

            if (!error && data) {
                setPrograms(data as ProgramListItem[])
            }

            setLoading(false)
        }

        loadPrograms()
    }, [])

    const filteredPrograms = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return programs
        return programs.filter((program) => {
            return (
                program.title.toLowerCase().includes(q) ||
                (program.description || "").toLowerCase().includes(q)
            )
        })
    }, [programs, search])

    return (
        <div className="container p-6 space-y-10">
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-500/10 via-background to-indigo-500/10 px-6 py-10 md:px-10">
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
                <div className="relative space-y-4">
                    <Badge variant="secondary" className="w-fit">{t('programs.badge', 'Programs')}</Badge>
                    <h1 className="text-3xl font-bold">{t('programs.title', 'Structured learning paths')}</h1>
                    <p className="text-muted-foreground max-w-2xl">
                        {t('programs.subtitle', 'Follow guided programs built from multiple courses. Track the journey and focus on the skills that matter.')}
                    </p>
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder={t('programs.search.placeholder', 'Search programs')}
                            className="pl-10"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Card key={`program-skel-${index}`} className="overflow-hidden">
                            <div className="h-40 w-full animate-pulse bg-muted" />
                            <CardHeader className="space-y-2">
                                <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
                                <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="h-4 w-full rounded bg-muted animate-pulse" />
                                <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
                            </CardContent>
                            <CardFooter>
                                <div className="h-10 w-full rounded bg-muted animate-pulse" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : filteredPrograms.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                        <p className="text-lg font-medium">{t('programs.empty.title', 'No programs yet')}</p>
                        <p className="text-sm text-muted-foreground">{t('programs.empty.subtitle', 'Try a different search term.')}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPrograms.map((program) => (
                        <ProgramCard key={program.id} program={program} />
                    ))}
                </div>
            )}
        </div>
    )
}

function ProgramCard({ program }: { program: ProgramListItem }) {
    const { t } = useLanguage()
    const courseCount = program.program_courses?.length ?? 0
    const requiredCount = program.program_courses?.filter((row) => row.is_required).length ?? 0

    return (
        <Card className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="relative h-40 w-full overflow-hidden">
                <img
                    src={program.thumbnail || "/assets/images/default.jpg"}
                    alt={program.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute left-4 top-4">
                    <Badge className="bg-black/60 text-white">{t('programs.card.badge', 'Program')}</Badge>
                </div>
                <div className="absolute bottom-4 left-4">
                    <p className="text-sm text-white/80">{formatPrice(program.price)}</p>
                </div>
            </div>

            <CardHeader className="space-y-2">
                <CardTitle className="text-xl leading-tight">{program.title}</CardTitle>
                <CardDescription className="line-clamp-2">{program.description || t('programs.card.noDescription', 'No description yet.')}</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                    <Layers className="h-4 w-4" />
                    <span>{courseCount} {t('programs.card.courses', 'courses')}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span>{requiredCount} {t('programs.card.required', 'required')}</span>
                </div>
            </CardContent>

            <CardFooter>
                <Button asChild className="w-full">
                    <TransitionLink href={`/learn/programs/${program.slug}`} className="flex items-center justify-center gap-2">
                        {t('programs.card.viewProgram', 'View program')}
                        <ArrowRight className="h-4 w-4" />
                    </TransitionLink>
                </Button>
            </CardFooter>
        </Card>
    )
}
