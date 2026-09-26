"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import TransitionLink from "@/components/transition-link"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ArrowRight, BookOpen, Clock, CreditCard, Layers, Loader2, ShieldCheck, Star, Users, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

interface ProgramCourseRow {
    sort_order: number | null
    is_required: boolean | null
    courses: {
        id: number
        title: string
        slug: string
        description: string | null
        hero_image: string | null
        category: string | null
        level: string | null
        estimated_hours: number | null
        students: number | null
        rating: number | null
    } | null
}

interface ProgramRow {
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

export default function ProgramDetailPage() {
    const router = useRouter()
    const params = useParams() as { slug: string }
    const programSlug = params?.slug
    const [program, setProgram] = useState<ProgramRow | null>(null)
    const [loading, setLoading] = useState(true)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const { t } = useLanguage()

    useEffect(() => {
        if (!programSlug) return

        const loadProgram = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from("programs")
                .select(
                    "id, title, slug, description, status, thumbnail, price, program_courses (sort_order, is_required, courses (id, title, slug, description, hero_image, category, level, estimated_hours, students, rating))"
                )
                .eq("slug", programSlug)
                .eq("status", "published")
                .order("sort_order", { foreignTable: "program_courses", ascending: true })
                .single()

            if (!error && data) {
                setProgram(data as ProgramRow)
            }

            setLoading(false)
        }

        loadProgram()
    }, [programSlug])

    const programCourses = program?.program_courses ?? []

    const firstCourseSlug = useMemo(() => {
        const firstCourse = programCourses.find((row) => row.courses?.slug)
        return firstCourse?.courses?.slug || null
    }, [programCourses])

    if (loading) {
        return (
            <div className="container p-6">
                <div className="h-64 w-full rounded-2xl bg-muted animate-pulse" />
                <div className="mt-8 grid gap-6 md:grid-cols-[2fr_1fr]">
                    <Card className="h-72 animate-pulse" />
                    <Card className="h-72 animate-pulse" />
                </div>
            </div>
        )
    }

    if (!program) {
        return (
            <div className="container p-6">
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                        <p className="text-lg font-medium">Program not found</p>
                        <p className="text-sm text-muted-foreground">{t('programDetail.notFound.subtitle', 'Try another program.')}</p>
                        <Button asChild variant="outline" className="mt-4">
                            <TransitionLink href="/learn/programs">{t('programDetail.backToPrograms', 'Back to programs')}</TransitionLink>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const requiredCount = programCourses.filter((row) => row.is_required).length

    const handleStartProgram = () => {
        if (!firstCourseSlug) return
        setShowPaymentModal(true)
    }

    return (
        <div className="container p-6 space-y-10">
            <div className="relative overflow-hidden rounded-2xl border">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-transparent" />
                <img
                    src={program.thumbnail || "/assets/images/default.jpg"}
                    alt={program.title}
                    className="h-64 w-full object-cover"
                />
                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
                    <Badge className="w-fit bg-white/15 text-white">Program</Badge>
                    <h1 className="mt-4 text-3xl font-bold text-white md:text-4xl">{program.title}</h1>
                    <p className="mt-3 max-w-2xl text-sm text-white/80">
                        {program.description || t('programs.card.noDescription', 'No description yet.')}
                    </p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-6">
                    <div className="flex flex-wrap gap-3">
                        <Badge variant="secondary" className="gap-2">
                            <Layers className="h-4 w-4" />
                            {programCourses.length} {t('programs.card.courses', 'courses')}
                        </Badge>
                        <Badge variant="secondary" className="gap-2">
                            <BookOpen className="h-4 w-4" />
                            {requiredCount} {t('programs.card.required', 'required')}
                        </Badge>
                        <Badge variant="secondary" className="gap-2">
                            {formatPrice(program.price)}
                        </Badge>
                    </div>

                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle>{t('programDetail.courses.title', 'Program courses')}</CardTitle>
                            <CardDescription>{t('programDetail.courses.subtitle', 'Follow this order to complete the program.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {programCourses.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t('programDetail.courses.empty', 'No courses added yet.')}</p>
                            ) : (
                                programCourses.map((row, index) => (
                                    <CourseRow key={`${row.courses?.id ?? index}`} row={row} index={index} />
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle>{t('programDetail.summary.title', 'Program summary')}</CardTitle>
                            <CardDescription>{t('programDetail.summary.subtitle', 'What you will cover')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">{t('programDetail.summary.courses', 'Courses')}</span>
                                <span className="font-medium">{programCourses.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">{t('programDetail.summary.required', 'Required')}</span>
                                <span className="font-medium">{requiredCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">{t('programDetail.summary.optional', 'Optional')}</span>
                                <span className="font-medium">{programCourses.length - requiredCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">{t('programDetail.summary.price', 'Price')}</span>
                                <span className="font-medium">{formatPrice(program.price)}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            {firstCourseSlug && (
                                <Button className="w-full" onClick={handleStartProgram}>
                                    <span className="flex items-center justify-center gap-2">
                                        {t('programDetail.action.startProgram', 'Start program')}
                                        <ArrowRight className="h-4 w-4" />
                                    </span>
                                </Button>
                            )}
                            <Button asChild variant="outline" className="w-full">
                                <TransitionLink href="/learn/programs">{t('programDetail.backToPrograms', 'Back to programs')}</TransitionLink>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            {firstCourseSlug && (
                <ProgramPaymentModal
                    open={showPaymentModal}
                    program={program}
                    courseCount={programCourses.length}
                    onClose={() => setShowPaymentModal(false)}
                    onPaymentSuccess={() => {
                        setShowPaymentModal(false)
                        router.push(`/learn/course/${firstCourseSlug}`)
                    }}
                />
            )}
        </div>
    )
}

function ProgramPaymentModal({
    open,
    program,
    courseCount,
    onClose,
    onPaymentSuccess,
}: {
    open: boolean
    program: ProgramRow
    courseCount: number
    onClose: () => void
    onPaymentSuccess: () => void
}) {
    const { t } = useLanguage()
    const [step, setStep] = useState<"review" | "payment" | "processing" | "success">("review")
    const [selectedMethod, setSelectedMethod] = useState<"telebirr" | "chappa" | "cbe-mobile" | "cbe-birr">(
        "telebirr"
    )
    const [discountCode, setDiscountCode] = useState("")

    const isPaidProgram = program.price !== null && program.price > 0
    const formattedPrice = formatPrice(program.price)

    const paymentMethods = [
        { id: "telebirr", name: "Telebirr", file: "Ethio Telecom Logo.svg" },
        { id: "chappa", name: "Chappa", file: "Chapa Logo.svg" },
        { id: "cbe-mobile", name: "CBE Mobile", file: "Commercial Bank of Ethiopia Logo.png" },
        { id: "cbe-birr", name: "CBE Birr", file: "CBE Birr ( No background ) Logo.svg" },
    ] as const

    useEffect(() => {
        if (!open) {
            setStep("review")
            setSelectedMethod("telebirr")
            setDiscountCode("")
        }
    }, [open])

    const handleFakePayment = () => {
        setStep("processing")
        setTimeout(() => {
            setStep("success")
            setTimeout(() => {
                onPaymentSuccess()
            }, 1000)
        }, 1800)
    }

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isPaidProgram ? t('programPayment.title.paid', 'Complete Program Enrollment') : t('programPayment.title.free', 'Confirm Program Start')}</DialogTitle>
                </DialogHeader>

                {step === "review" && (
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="p-4 space-y-2">
                                <img
                                    src={program.thumbnail || "/assets/images/default.jpg"}
                                    alt={program.title}
                                    className="rounded-md h-32 w-full object-cover"
                                />
                                <h3 className="text-lg font-semibold">{program.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {program.description || t('programPayment.noDescription', 'No description available.')}
                                </p>

                                <div className="flex justify-between text-sm mt-2">
                                    <span>{t('programPayment.includedCourses', 'Included courses')}</span>
                                    <span>{courseCount}</span>
                                </div>

                                <div className="flex justify-between font-semibold mt-2">
                                    <span>{t('programPayment.total', 'Total')}</span>
                                    <span>{formattedPrice}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-green-600" />
                            {isPaidProgram
                                ? t('programPayment.security.paid', 'Secure demo payment - local methods, no real charges')
                                : t('programPayment.security.free', 'This program is free. Confirm and start learning.')}
                        </div>

                        <Button className="w-full" onClick={() => (isPaidProgram ? setStep("payment") : handleFakePayment())}>
                            {isPaidProgram ? t('programPayment.action.proceed', 'Proceed to Payment') : t('programDetail.action.startProgram', 'Start program')}
                        </Button>
                    </div>
                )}

                {step === "payment" && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CreditCard className="w-4 h-4" />
                            {t('programPayment.method.choose', 'Choose a local payment method')}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {paymentMethods.map((method) => {
                                const isSelected = selectedMethod === method.id
                                return (
                                    <button
                                        key={method.id}
                                        type="button"
                                        onClick={() => setSelectedMethod(method.id)}
                                        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left transition ${isSelected
                                            ? "border-primary bg-primary/5"
                                            : "border-border bg-background hover:border-primary/50"
                                            }`}
                                        aria-pressed={isSelected}
                                    >
                                        <img
                                            src={encodeURI(`/assets/images/companyLogos/${method.file}`)}
                                            alt={`${method.name} logo`}
                                            className="h-6 w-auto object-contain"
                                        />
                                        <span className="text-xs font-medium">{method.name}</span>
                                    </button>
                                )
                            })}
                        </div>

                        <Input placeholder={t('programPayment.field.mobile', 'Mobile number')} />
                        <Input placeholder={t('programPayment.field.fullName', 'Full name')} />
                        <Input
                            placeholder={t('programPayment.field.discount', 'Discount code (optional)')}
                            value={discountCode}
                            onChange={(event) => setDiscountCode(event.target.value)}
                        />

                        <Button className="w-full" onClick={handleFakePayment}>
                            {t('programPayment.action.pay', 'Pay')} {formattedPrice}
                        </Button>

                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => setStep("review")}
                        >
                            {t('programPayment.action.back', 'Back')}
                        </Button>
                    </div>
                )}

                {step === "processing" && (
                    <div className="flex flex-col items-center py-8 space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <p className="text-sm">{t('programPayment.processing', 'Processing payment...')}</p>
                    </div>
                )}

                {step === "success" && (
                    <div className="flex flex-col items-center py-8 space-y-2 text-green-600">
                        <CheckCircle2 className="w-8 h-8" />
                        <p className="font-semibold">{t('programPayment.success.title', 'Enrollment successful!')}</p>
                        <p className="text-sm text-muted-foreground">{t('programPayment.success.subtitle', 'Starting your program...')}</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

function CourseRow({ row, index }: { row: ProgramCourseRow; index: number }) {
    const { t } = useLanguage()
    const course = row.courses
    const estimated = course?.estimated_hours ? `${course.estimated_hours} ${t('learn.course.hours', 'hrs')}` : ""

    return (
        <Card className="border border-border/70">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{t('programDetail.courseRow.step', 'Step')} {row.sort_order ?? index + 1}</Badge>
                        {row.is_required ? <Badge>{t('programDetail.summary.required', 'Required')}</Badge> : <Badge variant="outline">{t('programDetail.summary.optional', 'Optional')}</Badge>}
                    </div>
                    <h3 className="text-lg font-semibold">{course?.title || t('programDetail.courseRow.untitled', 'Untitled course')}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {course?.description || t('programPayment.noDescription', 'No description available.')}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {course?.category && <span>{course.category}</span>}
                        {course?.level && <span>{course.level}</span>}
                        {estimated && (
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {estimated}
                            </span>
                        )}
                        {course?.students !== null && course?.students !== undefined && (
                            <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {course.students.toLocaleString()}
                            </span>
                        )}
                        {course?.rating !== null && course?.rating !== undefined && (
                            <span className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {course.rating}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex w-full flex-col gap-3 md:w-auto md:items-end">
                    <div className="h-20 w-full overflow-hidden rounded-lg border md:h-16 md:w-32">
                        <img
                            src={course?.hero_image || "/assets/images/default.jpg"}
                            alt={course?.title || "Course"}
                            className="h-full w-full object-cover"
                            loading="lazy"
                        />
                    </div>
                    {course?.slug && (
                        <Button asChild variant="outline" size="sm" className="w-full md:w-auto">
                            <TransitionLink href={`/learn/course/${course.slug}`}>{t('learn.card.viewCourse', 'View Course')}</TransitionLink>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
