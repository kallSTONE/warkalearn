"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useSupabase } from "@/components/providers/supabase-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { translate } from "@/lib/i18n"
import TransitionLink from "@/components/transition-link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { CalendarDays, CheckCircle2, Clock, CreditCard, Loader2, Lock, Sparkles, Users } from "lucide-react"

interface LiveClassRow {
  id: string
  slug: string
  title: string
  description: string | null
  instructor_name: string
  instructor_avatar_url: string | null
  cover_image_url: string | null
  meeting_platform: string
  meeting_url: string | null
  start_at: string
  end_at: string | null
  timezone: string
  price: number
  currency: string
  seats_total: number | null
  status: string
  registration_status: string
}

interface LiveRegistrationRow {
  id: string
  live_class_id: string
  amount_paid: number
  payment_status: string
  registration_status: string
  live_classes: {
    id: string
    slug: string
    title: string
    start_at: string
    meeting_platform: string
    meeting_url: string | null
    cover_image_url: string | null
  } | null
}

const paymentMethods = [
  { id: "telebirr", name: "Telebirr" },
  { id: "chappa", name: "Chapa" },
  { id: "cbe-birr", name: "CBE Birr" },
  { id: "demo_checkout", name: "Demo checkout" },
] as const

export default function LiveClassesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const focusSlug = searchParams.get("focus")
  const { user, loading: authLoading, supabase: userClient } = useSupabase()
  const { locale } = useLanguage()
  const { toast } = useToast()
  const t = (key: string, fallback?: string) => translate(locale, key, fallback)

  const [classes, setClasses] = useState<LiveClassRow[]>([])
  const [registrations, setRegistrations] = useState<LiveRegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<LiveClassRow | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<(typeof paymentMethods)[number]["id"]>("telebirr")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: classData, error: classError } = await supabase
        .from("live_classes")
        .select(
          "id, slug, title, description, instructor_name, instructor_avatar_url, cover_image_url, meeting_platform, meeting_url, start_at, end_at, timezone, price, currency, seats_total, status, registration_status"
        )
        .eq("status", "published")
        .order("start_at", { ascending: true })

      if (classError) {
        console.error("Live classes load error:", classError)
      }

      setClasses((classData || []) as LiveClassRow[])

      if (user) {
        const { data: regData, error: regError } = await userClient
          .from("live_class_registrations")
          .select(
            "id, live_class_id, amount_paid, payment_status, registration_status, live_classes(id, slug, title, start_at, meeting_platform, meeting_url, cover_image_url)"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (regError) {
          console.error("Live registrations load error:", regError)
        }

        setRegistrations((regData || []) as LiveRegistrationRow[])
      } else {
        setRegistrations([])
      }

      setLoading(false)
    }

    load()
  }, [user, userClient])

  useEffect(() => {
    if (!focusSlug || classes.length === 0 || authLoading) return
    const match = classes.find((item) => item.slug === focusSlug)
    if (match && user) {
      setSelectedClass(match)
    }
  }, [authLoading, classes, focusSlug, user])

  const registrationMap = useMemo(() => {
    return new Map(registrations.map((row) => [row.live_class_id, row]))
  }, [registrations])

  const upcomingRegistrations = useMemo(
    () =>
      registrations
        .filter((row) => Boolean(row.live_classes))
        .sort((a, b) => new Date(a.live_classes!.start_at).getTime() - new Date(b.live_classes!.start_at).getTime()),
    [registrations]
  )

  const handleReserve = async (liveClass: LiveClassRow) => {
    if (!user) {
      localStorage.setItem("redirectAfterLogin", `/learn/live?focus=${encodeURIComponent(liveClass.slug)}`)
      router.push("/register")
      return
    }

    const existing = registrationMap.get(liveClass.id)
    if (existing) {
      toast({
        title: t('liveClasses.alreadyReserved', 'Already reserved'),
        description: t('liveClasses.alreadyReservedDesc', 'This class is already in your schedule.'),
      })
      return
    }

    setSelectedClass(liveClass)
    setSelectedMethod("telebirr")
  }

  const submitRegistration = async () => {
    if (!selectedClass || !user) return

    setSubmitting(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token
      if (!accessToken) {
        throw new Error(t('auth.sessionMissing', 'Please sign in again to continue.'))
      }

      const response = await fetch(`/api/live-classes/${selectedClass.id}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          amount_paid: selectedClass.price,
          payment_method: selectedMethod,
          payment_reference: `${selectedMethod}-${selectedClass.slug}`,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(String(payload?.error ?? t('liveClasses.registerFailed', 'Unable to reserve the class.')))
      }

      toast({
        title: t('liveClasses.registerSuccess', 'Reservation confirmed'),
        description: t('liveClasses.registerSuccessDesc', 'Your live class has been added to your schedule.'),
      })

      setSelectedClass(null)
      const { data: refreshed } = await userClient
        .from("live_class_registrations")
        .select(
          "id, live_class_id, amount_paid, payment_status, registration_status, live_classes(id, slug, title, start_at, meeting_platform, meeting_url, cover_image_url)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      setRegistrations((refreshed || []) as LiveRegistrationRow[])
    } catch (error: any) {
      toast({
        title: t('liveClasses.registerFailedTitle', 'Reservation failed'),
        description: error?.message ?? t('liveClasses.registerFailed', 'Unable to reserve the class.'),
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const scheduleCount = upcomingRegistrations.length

  return (
    <div className="container px-4 sm:px-6 lg:px-10 py-6 md:py-8 space-y-8">
      <section className="overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-6 md:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge className="gap-2 rounded-full px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              {t('liveClasses.badge', 'Live learning')}
            </Badge>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-montserrat">{t('liveClasses.title', 'Reserve live classes and follow your schedule')}</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                {t(
                  'liveClasses.subtitle',
                  'Browse upcoming instructor-led sessions, open your account, pay the class fee, and keep every live session in one place.'
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="border-border/60 bg-background/80">
              <CardContent className="p-4 text-center">
                <CalendarDays className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2 text-2xl font-bold">{classes.length}</p>
                <p className="text-xs text-muted-foreground">{t('liveClasses.stats.upcoming', 'Upcoming classes')}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-background/80">
              <CardContent className="p-4 text-center">
                <Users className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2 text-2xl font-bold">{scheduleCount}</p>
                <p className="text-xs text-muted-foreground">{t('liveClasses.stats.mySchedule', 'My schedule')}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-background/80 col-span-2 sm:col-span-1">
              <CardContent className="p-4 text-center">
                <Lock className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2 text-sm font-medium">{t('liveClasses.stats.payment', 'Pay to reserve')}</p>
                <p className="text-xs text-muted-foreground">{t('liveClasses.stats.paymentDesc', 'Secure demo payment flow')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">{t('liveClasses.upcomingTitle', 'Upcoming live classes')}</h2>
              <p className="text-sm text-muted-foreground">{t('liveClasses.upcomingSubtitle', 'Choose a session and reserve your spot.')}</p>
            </div>
          </div>

          {loading ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                {t('liveClasses.loading', 'Loading live classes...')}
              </CardContent>
            </Card>
          ) : classes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg font-medium">{t('liveClasses.empty', 'No live classes are published yet.')}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('liveClasses.emptyDesc', 'Check back soon for new instructor-led sessions.')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {classes.map((liveClass) => {
                const reserved = registrationMap.has(liveClass.id)
                const startDate = new Date(liveClass.start_at)
                const seatsLabel = liveClass.seats_total ? `${liveClass.seats_total}` : t('liveClasses.seatsUnlimited', 'Unlimited')

                return (
                  <Card key={liveClass.id} className="overflow-hidden border-border/60 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    <img
                      src={liveClass.cover_image_url || '/assets/images/courses-Thumbnail/DefaultThumbnail.png'}
                      alt={liveClass.title}
                      className="h-44 w-full object-cover"
                    />
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={liveClass.registration_status === 'open' ? 'default' : 'secondary'}>
                          {liveClass.registration_status === 'open'
                            ? t('liveClasses.open', 'Registration open')
                            : t('liveClasses.closed', 'Registration closed')}
                        </Badge>
                        {reserved && <Badge variant="outline">{t('liveClasses.reserved', 'Reserved')}</Badge>}
                      </div>
                      <CardTitle className="text-xl">{liveClass.title}</CardTitle>
                      <CardDescription className="line-clamp-3">{liveClass.description || t('liveClasses.noDescription', 'Instructor-led live session.')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{liveClass.instructor_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{startDate.toLocaleString(locale, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CreditCard className="h-4 w-4" />
                        <span>{liveClass.currency} {Number(liveClass.price || 0).toLocaleString(locale)} • {liveClass.meeting_platform}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{t('liveClasses.seats', 'Seats')}: {seatsLabel}</span>
                      </div>
                    </CardContent>
                    <CardContent className="pt-0">
                      {reserved ? (
                        <Button className="w-full" variant="outline" asChild>
                          <TransitionLink href="/dashboard">{t('liveClasses.viewSchedule', 'View in dashboard')}</TransitionLink>
                        </Button>
                      ) : (
                        <Button className="w-full" onClick={() => handleReserve(liveClass)}>
                          {user ? t('home.live.reserve', 'Reserve spot') : t('auth.signup', 'Open account')}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('liveClasses.scheduleTitle', 'My live class schedule')}</CardTitle>
              <CardDescription>{t('liveClasses.scheduleSubtitle', 'Upcoming reserved live sessions.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user ? (
                <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                  <p>{t('liveClasses.scheduleGuest', 'Create your account to reserve live classes and view your schedule.')}</p>
                  <Button className="mt-4" asChild>
                    <TransitionLink href="/register">{t('auth.signup', 'Open account')}</TransitionLink>
                  </Button>
                </div>
              ) : upcomingRegistrations.length === 0 ? (
                <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                  {t('liveClasses.scheduleEmpty', 'No live classes booked yet.')}
                </div>
              ) : (
                upcomingRegistrations.map((registration) => {
                  const liveClass = registration.live_classes!
                  const startDate = new Date(liveClass.start_at)
                  return (
                    <div key={registration.id} className="rounded-2xl border bg-card/50 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold leading-snug">{liveClass.title}</h3>
                          <p className="text-sm text-muted-foreground">{liveClass.meeting_platform}</p>
                        </div>
                        <Badge variant={registration.payment_status === 'paid' ? 'default' : 'secondary'}>{registration.payment_status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {startDate.toLocaleString(locale, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                      {liveClass.meeting_url ? (
                        <Button className="w-full" variant="outline" asChild>
                          <a href={liveClass.meeting_url} target="_blank" rel="noreferrer">
                            {t('liveClasses.join', 'Join class')}
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={Boolean(selectedClass)} onOpenChange={(open) => !open && setSelectedClass(null)}>
        <DialogContent className="max-w-lg">
          {selectedClass && (
            <>
              <DialogHeader>
                <DialogTitle>{t('liveClasses.reserveTitle', 'Reserve live class')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Card>
                  <img
                    src={selectedClass.cover_image_url || '/assets/images/courses-Thumbnail/DefaultThumbnail.png'}
                    alt={selectedClass.title}
                    className="h-40 w-full rounded-t-lg object-cover"
                  />
                  <CardContent className="space-y-2 p-4">
                    <h3 className="text-lg font-semibold">{selectedClass.title}</h3>
                    <p className="text-sm text-muted-foreground">{selectedClass.description || t('liveClasses.noDescription', 'Instructor-led live session.')}</p>
                    <div className="flex justify-between text-sm">
                      <span>{selectedClass.instructor_name}</span>
                      <span>{selectedClass.currency} {Number(selectedClass.price || 0).toLocaleString(locale)}</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <p className="text-sm font-medium">{t('liveClasses.choosePayment', 'Choose payment method')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethod(method.id)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${selectedMethod === method.id ? 'border-primary bg-primary/10' : 'bg-background hover:bg-muted/40'}`}
                      >
                        {method.name}
                      </button>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={submitRegistration} disabled={submitting}>
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('liveClasses.processing', 'Processing payment...')}
                    </span>
                  ) : (
                    t('liveClasses.payAndReserve', 'Pay and reserve')
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
