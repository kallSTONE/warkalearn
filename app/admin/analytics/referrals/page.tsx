"use client"

import { useEffect, useMemo, useState } from "react"
import { useSupabase } from "@/components/providers/supabase-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Gift, ShieldCheck, Trophy, Users } from "lucide-react"

type ReferralStudent = {
    id: string
    fullName: string
    referralPoints: number
    successfulInvites: number
    freeCoursesAwarded: number
    rewarded: boolean
    isEligiblePending: boolean
    hasPendingRequest: boolean
    latestRequestId: string | null
    latestRequestedCourseId: number | null
    latestRequestedCourseTitle: string | null
    latestRequestAdminNote: string | null
    lastRewardedAt: string | null
}

const REWARD_THRESHOLD = 300

type AdminOverviewResponse = {
    metrics: {
        studentsWithPoints: number
        totalPointsIssued: number
        studentsRewarded: number
        pendingRewards: number
    }
    students: ReferralStudent[]
}

export default function AdminReferralAnalysisPage() {
    const { supabase } = useSupabase()
    const [isReferralSystemActive, setIsReferralSystemActive] = useState(true)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [nextToggleValue, setNextToggleValue] = useState<boolean | null>(null)
    const [students, setStudents] = useState<ReferralStudent[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingToggle, setIsSavingToggle] = useState(false)
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)
    const [actionMessage, setActionMessage] = useState<string | null>(null)
    const [pageError, setPageError] = useState<string | null>(null)
    const itemsPerPage = 10

    const loadPageData = async () => {
        setIsLoading(true)
        setPageError(null)

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            const accessToken = session?.access_token
            if (!accessToken) {
                throw new Error("Missing session token.")
            }

            const requestTs = Date.now()

            const [overviewResponse, settingsResponse] = await Promise.all([
                fetch(`/api/admin/referrals/overview?_ts=${requestTs}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    cache: "no-store",
                }),
                fetch(`/api/admin/referrals/settings?_ts=${requestTs}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    cache: "no-store",
                }),
            ])

            const overviewPayload = await overviewResponse.json().catch(() => ({}))
            const settingsPayload = await settingsResponse.json().catch(() => ({}))

            if (!overviewResponse.ok) {
                throw new Error(String(overviewPayload?.error ?? "Unable to load referral overview."))
            }

            if (!settingsResponse.ok) {
                throw new Error(String(settingsPayload?.error ?? "Unable to load referral settings."))
            }

            const overview = overviewPayload as AdminOverviewResponse
            setStudents(overview.students ?? [])
            setIsReferralSystemActive(Boolean(settingsPayload?.settings?.is_active))
        } catch (error: any) {
            setPageError(error?.message ?? "Unable to load referral analytics.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        void loadPageData()
    }, [])

    const studentsWithPoints = useMemo(
        () => students.filter((student) => student.referralPoints > 0),
        [students]
    )

    const totalPointsIssued = useMemo(
        () => studentsWithPoints.reduce((sum, student) => sum + student.referralPoints, 0),
        [studentsWithPoints]
    )

    const rewardedStudents = useMemo(
        () => studentsWithPoints.filter((student) => student.rewarded),
        [studentsWithPoints]
    )

    const pendingRewardStudents = useMemo(
        () =>
            studentsWithPoints.filter(
                (student) =>
                    student.referralPoints >= REWARD_THRESHOLD &&
                    (!student.rewarded || student.isEligiblePending || student.hasPendingRequest)
            ),
        [studentsWithPoints]
    )

        const totalPages = Math.max(1, Math.ceil(studentsWithPoints.length / itemsPerPage))

        const paginatedStudents = useMemo(() => {
            const start = (currentPage - 1) * itemsPerPage
            return studentsWithPoints.slice(start, start + itemsPerPage)
        }, [currentPage, studentsWithPoints])

        const getVisiblePages = (page: number, pages: number) => {
            if (pages <= 3) return Array.from({ length: pages }, (_, index) => index + 1)
            if (page <= 2) return [1, 2, 3]
            if (page >= pages - 1) return [pages - 2, pages - 1, pages]
            return [page - 1, page, page + 1]
        }

        const renderPagination = () => {
            if (totalPages <= 1) return null

            return (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3"
                    >
                        &lt;&lt;
                    </Button>
                    {getVisiblePages(currentPage, totalPages).map((page) => (
                        <Button
                            key={`referral-page-${page}`}
                            size="sm"
                            variant={currentPage === page ? "default" : "outline"}
                            onClick={() => setCurrentPage(page)}
                            className="min-w-10 px-3"
                        >
                            {page}
                        </Button>
                    ))}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3"
                    >
                        &gt;&gt;
                    </Button>
                </div>
            )
        }

        useEffect(() => {
            if (currentPage > totalPages) {
                setCurrentPage(totalPages)
            }
        }, [currentPage, totalPages])

    const openToggleConfirmation = (value: boolean) => {
        setNextToggleValue(value)
        setConfirmOpen(true)
    }

    const confirmToggle = () => {
        if (nextToggleValue === null) {
            return
        }

        const run = async () => {
            setIsSavingToggle(true)

            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession()

                const accessToken = session?.access_token
                if (!accessToken) {
                    throw new Error("Missing session token.")
                }

                const response = await fetch("/api/admin/referrals/settings", {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ isActive: nextToggleValue }),
                    cache: "no-store",
                })

                const payload = await response.json().catch(() => ({}))

                if (!response.ok) {
                    throw new Error(String(payload?.error ?? "Unable to update referral system setting."))
                }

                setIsReferralSystemActive(Boolean(payload?.settings?.is_active))
            } catch (error: any) {
                setPageError(error?.message ?? "Unable to update referral system setting.")
            } finally {
                setIsSavingToggle(false)
                setNextToggleValue(null)
                setConfirmOpen(false)
            }
        }

        void run()
    }

    const handleRewardRequestAction = (
        requestId: string,
        action: "approve" | "reject",
        studentName: string
    ) => {
        const run = async () => {
            setActionMessage(null)
            setProcessingRequestId(requestId)
            setPageError(null)

            try {
                const adminNote =
                    action === "reject"
                        ? window.prompt(
                            `Optional note for ${studentName} (e.g. Please choose a different course):`,
                            ""
                        )
                        : ""

                if (action === "reject" && adminNote === null) {
                    setProcessingRequestId(null)
                    return
                }

                const {
                    data: { session },
                } = await supabase.auth.getSession()

                const accessToken = session?.access_token
                if (!accessToken) {
                    throw new Error("Missing session token.")
                }

                const response = await fetch(`/api/admin/referrals/reward-requests/${requestId}`, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    cache: "no-store",
                    body: JSON.stringify({ action, adminNote }),
                })

                const payload = await response.json().catch(() => ({}))
                if (!response.ok) {
                    throw new Error(String(payload?.error ?? "Unable to update reward request."))
                }

                if (action === "approve") {
                    const codes = Array.isArray(payload?.codes) ? payload.codes : []
                    setActionMessage(
                        codes.length > 0
                            ? `Approved and generated ${codes.length} one-time code(s): ${codes.join(", ")}`
                            : "Approved reward request successfully."
                    )
                } else {
                    setActionMessage(
                        `Rejected reward request${adminNote ? ` with note: ${adminNote}` : ""}.`
                    )
                }

                await loadPageData()
            } catch (error: any) {
                setPageError(error?.message ?? "Unable to update reward request.")
            } finally {
                setProcessingRequestId(null)
            }
        }

        void run()
    }

    if (isLoading) {
        return (
            <div className="p-4 md:p-8">
                <p className="text-muted-foreground">Loading referral analytics ...</p>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
            <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Referral Analysis & Control</h1>
                        <p className="text-muted-foreground mt-2">
                            Admin view for tracking referral points, reward eligibility, and system status.
                        </p>
                        {pageError ? (
                            <p className="text-sm text-destructive mt-2">{pageError}</p>
                        ) : null}
                        {actionMessage ? (
                            <p className="text-sm text-primary mt-2">{actionMessage}</p>
                        ) : null}
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => {
                            void loadPageData()
                        }}
                        disabled={isLoading || isSavingToggle}
                    >
                        {isLoading ? "Refreshing..." : "Refresh"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Students with points
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl md:text-2xl font-bold">{studentsWithPoints.length}</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Gift className="h-4 w-4" />
                            Total points issued
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl md:text-2xl font-bold">{totalPointsIssued}</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            Students rewarded
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl md:text-2xl font-bold">{rewardedStudents.length}</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            Pending rewards
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl md:text-2xl font-bold">{pendingRewardStudents.length}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-primary/30 bg-primary/5 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle>Referral System Control</CardTitle>
                    <CardDescription>
                        This toggle controls whether new referral claims can be processed . 
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border bg-background p-4">
                        <div className="space-y-1">
                            <p className="font-medium">Referral system status</p>
                            <p className="text-sm text-muted-foreground">
                                {isReferralSystemActive
                                    ? "Invites and reward tracking are currently active."
                                    : "Invites and reward tracking are currently paused."}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Badge variant={isReferralSystemActive ? "default" : "secondary"}>
                                {isReferralSystemActive ? "Active" : "Inactive"}
                            </Badge>

                            <Switch
                                checked={isReferralSystemActive}
                                onCheckedChange={openToggleConfirmation}
                                aria-label="Toggle referral system"
                                disabled={isSavingToggle}
                            />
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Safety check: every toggle request requires confirmation to avoid accidental changes.
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle>Student referral reward status</CardTitle>
                    <CardDescription>
                        Students with referral points, reward eligibility, and free course awards.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-3 md:hidden">
                        {paginatedStudents.map((student) => {
                            const isPendingReward =
                                student.referralPoints >= REWARD_THRESHOLD && !student.rewarded

                            return (
                                <div key={student.id} className="rounded-2xl border border-border p-3 space-y-3 shadow-sm">
                                    <div>
                                        <p className="font-semibold text-foreground">{student.fullName}</p>
                                        <p className="text-xs text-muted-foreground mt-1">User ID: {student.id}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Points</p>
                                            <p className="font-medium text-foreground">{student.referralPoints}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Invites</p>
                                            <p className="font-medium text-foreground">{student.successfulInvites}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Free courses</p>
                                            <p className="font-medium text-foreground">{student.freeCoursesAwarded}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Requested course</p>
                                            <p className="font-medium text-foreground">
                                                {student.latestRequestedCourseTitle ?? "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Last rewarded</p>
                                            <p className="font-medium text-foreground">
                                                {student.lastRewardedAt
                                                    ? new Date(student.lastRewardedAt).toLocaleDateString()
                                                    : "—"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        {student.hasPendingRequest ? (
                                            <Badge variant="secondary">Request pending</Badge>
                                        ) : student.rewarded ? (
                                            <Badge>Rewarded</Badge>
                                        ) : isPendingReward || student.isEligiblePending ? (
                                            <Badge variant="secondary">Eligible - pending</Badge>
                                        ) : (
                                            <Badge variant="outline">In progress</Badge>
                                        )}
                                        {student.latestRequestId ? (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    disabled={processingRequestId === student.latestRequestId}
                                                    onClick={() => {
                                                        handleRewardRequestAction(
                                                            student.latestRequestId!,
                                                            "approve",
                                                            student.fullName
                                                        )
                                                    }}
                                                >
                                                    {processingRequestId === student.latestRequestId ? "Working..." : "Approve"}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={processingRequestId === student.latestRequestId}
                                                    onClick={() => {
                                                        handleRewardRequestAction(
                                                            student.latestRequestId!,
                                                            "reject",
                                                            student.fullName
                                                        )
                                                    }}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button variant="outline" size="sm" disabled>
                                                No action
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <Table className="hidden md:table">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Referral points</TableHead>
                                <TableHead>Invites</TableHead>
                                <TableHead>Free courses awarded</TableHead>
                                <TableHead>Requested course</TableHead>
                                <TableHead>Reward status</TableHead>
                                <TableHead>Last rewarded</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedStudents.map((student) => {
                                const isPendingReward =
                                    student.referralPoints >= REWARD_THRESHOLD && !student.rewarded

                                return (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{student.fullName}</p>
                                                <p className="text-xs text-muted-foreground">User ID: {student.id}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{student.referralPoints}</TableCell>
                                        <TableCell>{student.successfulInvites}</TableCell>
                                        <TableCell>{student.freeCoursesAwarded}</TableCell>
                                        <TableCell>{student.latestRequestedCourseTitle ?? "—"}</TableCell>
                                        <TableCell>
                                            {student.hasPendingRequest ? (
                                                <Badge variant="secondary">Request pending</Badge>
                                            ) : student.rewarded ? (
                                                <Badge>Rewarded</Badge>
                                            ) : isPendingReward || student.isEligiblePending ? (
                                                <Badge variant="secondary">Eligible - pending</Badge>
                                            ) : (
                                                <Badge variant="outline">In progress</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {student.lastRewardedAt
                                                ? new Date(student.lastRewardedAt).toLocaleDateString()
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {student.latestRequestId ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        disabled={processingRequestId === student.latestRequestId}
                                                        onClick={() => {
                                                            handleRewardRequestAction(
                                                                student.latestRequestId!,
                                                                "approve",
                                                                student.fullName
                                                            )
                                                        }}
                                                    >
                                                        {processingRequestId === student.latestRequestId ? "Working..." : "Approve"}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={processingRequestId === student.latestRequestId}
                                                        onClick={() => {
                                                            handleRewardRequestAction(
                                                                student.latestRequestId!,
                                                                "reject",
                                                                student.fullName
                                                            )
                                                        }}
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button variant="outline" size="sm" disabled>
                                                    No action
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                    {renderPagination()}
                </CardContent>
            </Card>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {nextToggleValue ? "Activate referral system?" : "Deactivate referral system?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {nextToggleValue
                                ? "This will enable referral point tracking in this demo control panel."
                                : "This will pause referral point tracking in this demo control panel."}
                            {" "}
                            Continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => {
                                setNextToggleValue(null)
                                setConfirmOpen(false)
                            }}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmToggle}>
                            {isSavingToggle ? "Saving..." : "Confirm"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
