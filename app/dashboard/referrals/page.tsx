'use client'

import { useCallback, useEffect, useState } from 'react'
import TransitionLink from '@/components/transition-link'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/supabase-provider'
import { useLanguage } from '@/components/providers/language-provider'
import { translate } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Gift, Copy, Check, Trophy, Users, ArrowRight } from 'lucide-react'

const POINTS_PER_REFERRAL = 100
const POINTS_PER_FREE_COURSE = 300

const rewardTiers = [ 
    { points: 300, freeCourses: 1, label: 'referrals.tier.first' },
    { points: 600, freeCourses: 2, label: 'referrals.tier.second' },
    { points: 900, freeCourses: 3, label: 'referrals.tier.third' },
]

type ReferralMeResponse = {
    referralCode: string | null
    referralPoints: number
    successfulInvites: number
    freeCoursesAwarded: number
    availableFreeCoursesToRequest: number
    pointsToNextReward: number
    latestRewardRequest: {
        id: string
        status: string
        requested_at: string
        free_courses_to_award: number
        requested_course_id?: number | null
        admin_note?: string | null
    } | null
}

type RewardCourse = {
    id: number
    title: string
    slug: string
}

type RewardCode = {
    id: string
    code: string
    created_at: string
    expires_at: string | null
    request_id: string
}

export default function ReferralRewardsPage() {
    const router = useRouter()
    const { user, loading, supabase } = useSupabase()
    const { locale } = useLanguage()
    const t = (key: string, fallback?: string) => translate(locale, key, fallback)
    const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null)
    const [referralData, setReferralData] = useState<ReferralMeResponse | null>(null)
    const [isDataLoading, setIsDataLoading] = useState(true)
    const [isSubmittingRewardRequest, setIsSubmittingRewardRequest] = useState(false)
    const [pageError, setPageError] = useState<string | null>(null)
    const [rewardRequestMessage, setRewardRequestMessage] = useState<string | null>(null)
    const [rewardCodes, setRewardCodes] = useState<RewardCode[]>([])
    const [rewardCourses, setRewardCourses] = useState<RewardCourse[]>([])
    const [selectedRewardCourseId, setSelectedRewardCourseId] = useState<number | null>(null)

    const loadReferralData = useCallback(async () => {
        if (!user || user.user_metadata?.role !== 'lawyer') {
            return
        }

        setIsDataLoading(true)
        setPageError(null)

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            const accessToken = session?.access_token
            if (!accessToken) {
                throw new Error(t('payment.error.missingToken', 'Missing session token.'))
            }

            const requestTs = Date.now()

            const [referralResponse, rewardCodesResponse, rewardCoursesResponse] = await Promise.all([
                fetch(`/api/referrals/me?_ts=${requestTs}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    cache: 'no-store',
                }),
                fetch(`/api/referrals/reward-codes?_ts=${requestTs}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    cache: 'no-store',
                }),
                fetch(`/api/referrals/reward-courses?_ts=${requestTs}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    cache: 'no-store',
                }),
            ])

            const payload = await referralResponse.json().catch(() => ({}))
            const rewardCodesPayload = await rewardCodesResponse.json().catch(() => ({}))
            const rewardCoursesPayload = await rewardCoursesResponse.json().catch(() => ({}))

            if (!referralResponse.ok) {
                throw new Error(String(payload?.error ?? t('referrals.error.loadData', 'Unable to load referral data.')))
            }

            if (!rewardCodesResponse.ok) {
                throw new Error(String(rewardCodesPayload?.error ?? t('referrals.error.loadCodes', 'Unable to load reward codes.')))
            }

            if (!rewardCoursesResponse.ok) {
                throw new Error(String(rewardCoursesPayload?.error ?? t('referrals.error.loadCourses', 'Unable to load reward courses.')))
            }

            setReferralData(payload as ReferralMeResponse)
            setRewardCodes(Array.isArray(rewardCodesPayload?.codes) ? rewardCodesPayload.codes : [])
            const courses = Array.isArray(rewardCoursesPayload?.courses)
                ? rewardCoursesPayload.courses
                : []
            setRewardCourses(courses)
            setSelectedRewardCourseId((current) => {
                if (typeof current === 'number') {
                    return current
                }

                return courses.length > 0 ? courses[0].id : null
            })
        } catch (error: any) {
            setPageError(error?.message ?? t('referrals.error.loadData', 'Unable to load referral data.'))
        } finally {
            setIsDataLoading(false)
        }
    }, [user, supabase])

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace('/login')
                return
            }

            if (user.user_metadata?.role !== 'lawyer') {
                router.replace('/dashboard')
            }
        }
    }, [user, loading, router])

    useEffect(() => {
        void loadReferralData()
    }, [loadReferralData])

    if (loading || isDataLoading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <div className="animate-pulse text-base sm:text-xl">{t('referrals.loading', 'Referral rewards loading...')}</div>
            </div>
        )
    }

    if (!user || user.user_metadata?.role !== 'lawyer') return null

    if (!referralData) {
        return (
            <div className="container px-4 sm:px-6 lg:px-10 py-6 md:py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('referrals.title', 'Referral Rewards')}</CardTitle>
                        <CardDescription>
                            {pageError ?? t('referrals.error.loadInfo', 'Unable to load referral information right now.')}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    const metadataCode = referralData.referralCode
    const fallbackCode = `BRONQ-${user.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
    const referralCode = typeof metadataCode === 'string' && metadataCode.trim().length > 0
        ? metadataCode.toUpperCase()
        : fallbackCode

    const referralPath = `/register?ref=${encodeURIComponent(referralCode)}`

    const successfulInvites = referralData.successfulInvites
    const referralPoints = referralData.referralPoints
    const unlockedFreeCourses = referralData.freeCoursesAwarded
    const pointsInCurrentTier = referralPoints % POINTS_PER_FREE_COURSE
    const progressValue = pointsInCurrentTier === 0 && referralPoints > 0
        ? 100
        : (pointsInCurrentTier / POINTS_PER_FREE_COURSE) * 100
    const pointsToNextReward = referralData.pointsToNextReward
    const invitesNeeded = Math.ceil(pointsToNextReward / POINTS_PER_REFERRAL)
    const canRequestReward =
        referralData.availableFreeCoursesToRequest > 0 &&
        referralData.latestRewardRequest?.status !== 'pending'

    const copyValue = async (type: 'code' | 'link') => {
        const linkValue = typeof window === 'undefined'
            ? referralPath
            : `${window.location.origin}${referralPath}`

        const value = type === 'code' ? referralCode : linkValue

        try {
            await navigator.clipboard.writeText(value)
            setCopiedType(type)
            window.setTimeout(() => setCopiedType(null), 1800)
        } catch (error) {
            console.error('Failed to copy value:', error)
        }
    }

    const submitRewardRequest = async () => {
        setIsSubmittingRewardRequest(true)
        setRewardRequestMessage(null)

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            const accessToken = session?.access_token
            if (!accessToken) {
                throw new Error(t('payment.error.missingToken', 'Missing session token.'))
            }

            if (!selectedRewardCourseId) {
                throw new Error(t('referrals.activation.selectCourse', 'Please select a course before submitting your request.'))
            }

            const response = await fetch('/api/referrals/request-reward', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
                body: JSON.stringify({ courseId: selectedRewardCourseId }),
            })

            const payload = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(String(payload?.error ?? t('referrals.error.submitRequest', 'Unable to submit reward request.')))
            }

            setRewardRequestMessage(t('referrals.success.requestSubmitted', 'Reward request submitted successfully. An admin will review it shortly.'))
            await loadReferralData()
        } catch (error: any) {
            setRewardRequestMessage(error?.message ?? t('referrals.error.submitRequest', 'Unable to submit reward request.'))
        } finally {
            setIsSubmittingRewardRequest(false)
        }
    }

    return (
        <div className="container px-4 sm:px-6 lg:px-10 py-6 md:py-8 space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">{t('referrals.title', 'Referral Rewards')}</h1>
                    <p className="text-muted-foreground">{t('referrals.subtitle', 'Invite more learners and turn points into free courses.')}</p>
                    {pageError ? (
                        <p className="text-sm text-destructive mt-2">{pageError}</p>
                    ) : null}
                </div>

                <div className="flex w-full sm:w-auto gap-2">
                    <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => {
                            void loadReferralData()
                        }}
                        disabled={isDataLoading}
                    >
                        {isDataLoading ? t('referrals.refreshing', 'Refreshing...') : t('referrals.refresh', 'Refresh')}
                    </Button>

                    <Button variant="outline" className="w-full sm:w-auto" asChild>
                        <TransitionLink href="/dashboard">{t('referrals.backDashboard', 'Back to dashboard')}</TransitionLink>
                    </Button>
                </div>
            </div>

            <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                        <Gift className="h-6 w-6 text-primary" />
                        {t('referrals.hero.title', 'Invite friends. Unlock free courses.')}
                    </CardTitle>
                    <CardDescription>
                        {t('referrals.hero.subtitle', 'Every successful invite gives you 100 points. Every 300 points unlocks a free course credit.')}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-lg border bg-background p-4">
                            <p className="text-sm text-muted-foreground">{t('referrals.stats.points', 'Your points')}</p>
                            <p className="text-xl sm:text-2xl font-bold mt-1">{referralPoints}</p>
                        </div>

                        <div className="rounded-lg border bg-background p-4">
                            <p className="text-sm text-muted-foreground">{t('referrals.stats.invites', 'Successful invites')}</p>
                            <p className="text-xl sm:text-2xl font-bold mt-1">{successfulInvites}</p>
                        </div>

                        <div className="rounded-lg border bg-background p-4">
                            <p className="text-sm text-muted-foreground">{t('referrals.stats.freeCourses', 'Free courses earned')}</p>
                            <p className="text-xl sm:text-2xl font-bold mt-1">{unlockedFreeCourses}</p>
                        </div>
                    </div>

                    <div className="rounded-lg border bg-background p-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t('referrals.progress.label', 'Progress to next free course')}</span>
                            <span className="font-medium">{Math.round(progressValue)}%</span>
                        </div>
                        <Progress value={progressValue} className="h-2" />

                        {pointsToNextReward > 0 ? (
                            <p className="text-sm">
                                {t('referrals.progress.youAre', 'You are')} <span className="font-semibold text-primary">{pointsToNextReward} {t('referrals.points', 'points')}</span> {t('referrals.progress.away', 'away from your next free course.')}
                                {' '}
                                {t('referrals.progress.invite', 'Invite')} <span className="font-semibold">{invitesNeeded}</span> {invitesNeeded === 1 ? t('referrals.friend', 'friend') : t('referrals.friends', 'friends')} {t('referrals.progress.unlock', 'to unlock it.')}
                            </p>
                        ) : (
                            <p className="text-sm font-medium text-primary">
                                {t('referrals.progress.reached', 'Amazing! You have reached your next free course milestone.')}
                            </p>
                        )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {t('referrals.progress.tip', 'Learners who invite early usually unlock their first free course faster. Keep your streak while your momentum is high.')}
                    </p>

                    <div className="rounded-lg border bg-background p-4 space-y-2">
                        <p className="text-sm font-medium">{t('referrals.activation.title', 'Reward activation')}</p>
                        <p className="text-sm text-muted-foreground">
                            {referralData.latestRewardRequest?.status === 'pending'
                                ? t('referrals.activation.pending', 'You already have a pending reward request awaiting admin activation.')
                                : `${t('referrals.activation.have', 'You currently have')} ${referralData.availableFreeCoursesToRequest} ${t('referrals.activation.eligible', 'eligible free course credit(s) available to request.')}`}
                        </p>
                        {referralData.latestRewardRequest?.admin_note ? (
                            <p className="text-xs text-destructive">
                                {t('referrals.activation.adminNote', 'Admin note')}: {referralData.latestRewardRequest.admin_note}
                            </p>
                        ) : null}
                        <div className="space-y-2">
                            <Label htmlFor="rewardCourseSelect">{t('referrals.activation.chooseCourse', 'Choose course for this request')}</Label>
                            <select
                                id="rewardCourseSelect"
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={selectedRewardCourseId ?? ''}
                                onChange={(event) => {
                                    const nextValue = Number(event.target.value)
                                    setSelectedRewardCourseId(Number.isFinite(nextValue) ? nextValue : null)
                                }}
                            >
                                {rewardCourses.map((courseOption) => (
                                    <option key={courseOption.id} value={courseOption.id}>
                                        {courseOption.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button
                            variant="outline"
                            onClick={submitRewardRequest}
                            disabled={!canRequestReward || isSubmittingRewardRequest || rewardCourses.length === 0}
                        >
                            {isSubmittingRewardRequest ? t('referrals.activation.submitting', 'Submitting request...') : t('referrals.activation.request', 'Request reward activation')}
                        </Button>
                        {rewardRequestMessage ? (
                            <p className="text-xs text-muted-foreground">{rewardRequestMessage}</p>
                        ) : null}
                    </div>

                    <div className="rounded-lg border bg-background p-4 space-y-3">
                        <p className="text-sm font-medium">{t('referrals.codes.title', 'Your one-time reward codes')}</p>
                        {rewardCodes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t('referrals.codes.empty', 'No active reward codes yet. Submit a reward activation request once eligible.')}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {rewardCodes.map((rewardCode) => (
                                    <div
                                        key={rewardCode.id}
                                        className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <p className="font-mono text-sm font-semibold">{rewardCode.code}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {rewardCode.expires_at
                                                    ? `${t('referrals.codes.expires', 'Expires')} ${new Date(rewardCode.expires_at).toLocaleDateString(locale)}`
                                                    : t('referrals.codes.noExpiry', 'No expiry set')}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(rewardCode.code)
                                                } catch (error) {
                                                    console.error('Failed to copy reward code:', error)
                                                }
                                            }}
                                        >
                                            {t('referrals.codes.copy', 'Copy code')}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            {t('referrals.codes.help', 'Use these codes in the course payment modal discount-code field to enroll for free.')}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">{t('referrals.code.title', 'Your referral code')}</CardTitle>
                        <CardDescription>{t('referrals.code.subtitle', 'Share this code directly with friends during sign up.')}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="referralCode">{t('referrals.code.label', 'Referral code')}</Label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input id="referralCode" value={referralCode} readOnly className="uppercase tracking-wide" />
                                <Button variant="outline" className="w-full sm:w-auto" onClick={() => copyValue('code')}>
                                    {copiedType === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('referrals.code.tip', 'Tip: messages with a direct code usually convert better.')}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">{t('referrals.link.title', 'Your invite link')}</CardTitle>
                        <CardDescription>{t('referrals.link.subtitle', 'One click for them, more points for you.')}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="referralLink">{t('referrals.link.label', 'Invite path')}</Label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input id="referralLink" value={referralPath} readOnly />
                                <Button variant="outline" className="w-full sm:w-auto" onClick={() => copyValue('link')}>
                                    {copiedType === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('referrals.link.tip', 'Share in class groups, Telegram, or with study friends.')}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        {t('referrals.milestones.title', 'Free course milestones')}
                    </CardTitle>
                    <CardDescription>{t('referrals.milestones.subtitle', 'Each milestone converts your points into real learning credits.')}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                    {rewardTiers.map((tier) => {
                        const unlocked = referralPoints >= tier.points

                        return (
                            <div
                                key={tier.points}
                                className={`rounded-lg border p-4 ${unlocked ? 'border-primary/40 bg-primary/5' : 'bg-card/50'}`}
                            >
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                    <div>
                                        <p className="font-semibold">{tier.points} {t('referrals.points', 'points')} {'->'} {tier.freeCourses} {t('referrals.free', 'free')} {tier.freeCourses === 1 ? t('referrals.course', 'course') : t('referrals.courses', 'courses')}</p>
                                        <p className="text-sm text-muted-foreground">{t(tier.label, 'Free course milestone')}</p>
                                    </div>
                                    <div className="text-sm font-medium">
                                        {unlocked ? (
                                            <span className="text-primary">{t('referrals.unlocked', 'Unlocked')}</span>
                                        ) : (
                                            <span className="text-muted-foreground">{t('referrals.inProgress', 'In progress')}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        {t('referrals.how.title', 'How it works')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border p-4">
                        <p className="font-semibold">1) {t('referrals.how.share', 'Share')}</p>
                        <p className="text-sm text-muted-foreground mt-1">{t('referrals.how.shareBody', 'Send your code or invite link to friends.')}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="font-semibold">2) {t('referrals.how.join', 'They join')}</p>
                        <p className="text-sm text-muted-foreground mt-1">{t('referrals.how.joinBody', 'When they register through your referral, points are added.')}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="font-semibold">3) {t('referrals.how.win', 'You win')}</p>
                        <p className="text-sm text-muted-foreground mt-1">{t('referrals.how.winBody', 'Convert points into free courses and keep leveling up.')}</p>
                    </div>

                    <div className="md:col-span-3 pt-2">
                        <Button onClick={() => copyValue('link')}>
                            {t('referrals.how.cta', 'Invite another friend now')}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}