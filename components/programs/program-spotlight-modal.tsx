"use client"

import { useEffect, useState } from "react"
import TransitionLink from "@/components/transition-link"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, ArrowRight, Layers, Sparkles, Tag } from "lucide-react"

interface ProgramRow {
    id: string
    title: string
    slug: string
    description: string | null
    thumbnail: string | null   
    price: number | null
    program_courses?: { id: string }[] | null
}
    
const formatPrice = (value: number | null) => {
    if (value === null) return "Free"
    if (value === 0) return "$0"
    return `$${value}`
}

export default function ProgramSpotlightModal({
    variant = "home",
}: {
    variant?: "home" | "learn"
}) {
    const [program, setProgram] = useState<ProgramRow | null>(null)
    const [open, setOpen] = useState(true)

    useEffect(() => {
        const loadProgram = async () => {
            const { data, error } = await supabase
                .from("programs")
                .select("id, title, slug, description, thumbnail, price, program_courses(id)")
                .eq("status", "published")
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle()

            if (!error && data) {
                setProgram(data as ProgramRow)
            }
        }

        loadProgram()
    }, [])

    if (!open || !program) return null

    const courseCount = program.program_courses?.length ?? 0

    return (
        <>
            {variant === "home" && (
                <div
                    className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                />
            )}
            <div
                className={cn(
                    "fixed z-50",
                    variant === "home"
                        ? "bottom-0 left-0 right-0"
                        : "top-24 right-4 md:right-8"
                )}
            >
                <div
                    className={cn(
                        "relative mx-auto overflow-hidden border shadow-2xl",
                        variant === "home"
                            ? "h-[35vh] w-full rounded-t-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white"
                            : "w-[320px] rounded-2xl bg-background"
                    )}
                >
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={() => setOpen(false)}
                        className={cn(
                            "absolute right-4 top-4 z-10 rounded-full p-2",
                            variant === "home" ? "bg-white/10 text-white hover:bg-white/20" : "bg-muted"
                        )}
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className={cn("grid h-full", variant === "home" ? "md:grid-cols-[1.1fr_1fr]" : "grid-cols-1")}
                    >
                        <div className={cn("relative", variant === "home" ? "p-8 md:p-10" : "p-5")}
                        >
                            <div className="flex items-center gap-2">
                                <Badge className={cn("gap-2", variant === "home" ? "bg-white/10 text-white" : "")}
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Program spotlight
                                </Badge>
                            </div>
                            <h3
                                className={cn(
                                    "mt-4 font-semibold",
                                    variant === "home" ? "text-3xl md:text-4xl" : "text-lg"
                                )}
                            >
                                {program.title}
                            </h3>
                            <p
                                className={cn(
                                    "mt-3 text-sm",
                                    variant === "home" ? "text-white/80" : "text-muted-foreground"
                                )}
                            >
                                {program.description || "A structured path built from our best courses."}
                            </p>

                            <div
                                className={cn(
                                    "mt-6 flex flex-wrap items-center gap-3 text-xs",
                                    variant === "home" ? "text-white/80" : "text-muted-foreground"
                                )}
                            >
                                <div className="flex items-center gap-1">
                                    <Layers className="h-3.5 w-3.5" />
                                    <span>{courseCount} courses</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Tag className="h-3.5 w-3.5" />
                                    <span>{formatPrice(program.price)}</span>
                                </div>
                            </div>

                            <div className={cn("mt-6", variant === "home" ? "flex gap-3" : "")}
                            >
                                <Button asChild className={cn("gap-2", variant === "home" ? "bg-white text-slate-900 hover:bg-white/90" : "w-full")}
                                >
                                    <TransitionLink
                                        href={`/learn/programs/${program.slug}`}
                                        className="flex items-center justify-center gap-2"
                                    >
                                        View program
                                        <ArrowRight className="h-4 w-4" />
                                    </TransitionLink>
                                </Button>
                                {variant === "home" && (
                                    <Button
                                        variant="outline"
                                        className="border-white/30 text-white hover:bg-white/10"
                                        onClick={() => setOpen(false)}
                                    >
                                        Maybe later
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className={cn("relative", variant === "home" ? "hidden md:block" : "")}
                        >
                            {variant === "home" && (
                                <>
                                    <img
                                        src={program.thumbnail || "/assets/images/default.jpg"}
                                        alt={program.title}
                                        className="h-full w-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/30 to-transparent" />
                                </>
                            )}
                            {variant === "learn" && (
                                <div className="mt-4 overflow-hidden rounded-xl border">
                                    <img
                                        src={program.thumbnail || "/assets/images/default.jpg"}
                                        alt={program.title}
                                        className="h-36 w-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
