"use client"

import { FormEvent, useMemo, useState } from "react"
import TransitionLink from "@/components/transition-link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Handshake, Users, DollarSign, TicketPercent } from "lucide-react"

type FakeAffiliate = {
    id: string
    name: string
    email: string
    discountCode: string
    studentsUsedCode: number
    revenueETB: number
    status: "active" | "paused"
}

const fakeAffiliates: FakeAffiliate[] = [
    {
        id: "aff-001",
        name: "Alemu Tech Hub",
        email: "alemu.hub@example.com",
        discountCode: "ALEMU20",
        studentsUsedCode: 34,
        revenueETB: 96700,
        status: "active",
    },
    {
        id: "aff-002",
        name: "Saron Learning Club",
        email: "saron.club@example.com",
        discountCode: "SARON15",
        studentsUsedCode: 21,
        revenueETB: 58200,
        status: "active",
    },
    {
        id: "aff-003",
        name: "Blue Ladder Academy",
        email: "blue.ladder@example.com",
        discountCode: "LADDER10",
        studentsUsedCode: 16,
        revenueETB: 39850,
        status: "paused",
    },
    {
        id: "aff-004",
        name: "SkillUp Addis",
        email: "skillup.addis@example.com",
        discountCode: "ADDIS25",
        studentsUsedCode: 28,
        revenueETB: 73400,
        status: "active",
    },
]

export default function AffiliateAnalyticsPage() {
    const [affiliateName, setAffiliateName] = useState("")
    const [affiliateEmail, setAffiliateEmail] = useState("")
    const [discountCode, setDiscountCode] = useState("")
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const totalStudentsByAffiliate = useMemo(
        () => fakeAffiliates.reduce((sum, item) => sum + item.studentsUsedCode, 0),
        []
    )

    const totalRevenueByAffiliate = useMemo(
        () => fakeAffiliates.reduce((sum, item) => sum + item.revenueETB, 0),
        []
    )

    const handleCreateAffiliate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        setSuccessMessage("Affiliate successfully created (demo). No record was stored.")
        setAffiliateName("")
        setAffiliateEmail("")
        setDiscountCode("")
    }

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Affiliate Analytics (Demo)</h1>
                    <p className="text-muted-foreground mt-2">
                        Simulate affiliate creation and monitor code usage and revenue impact.
                    </p>
                </div>

                    <Button variant="outline" className="shadow-sm" asChild>
                    <TransitionLink href="/admin/analytics">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Analytics
                    </TransitionLink>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Handshake className="h-4 w-4" />
                            Total affiliates
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-5">
                        <p className="text-xl md:text-2xl font-bold">{fakeAffiliates.length}</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Students from codes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-5">
                        <p className="text-xl md:text-2xl font-bold">{totalStudentsByAffiliate}</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Affiliate revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-5">
                        <p className="text-xl md:text-2xl font-bold">
                            {new Intl.NumberFormat("en-ET", {
                                style: "currency",
                                currency: "ETB",
                                maximumFractionDigits: 0,
                            }).format(totalRevenueByAffiliate)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle>Add new affiliate (Simulation)</CardTitle>
                    <CardDescription>
                        Submitting this form always returns a success message and does not save data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <form onSubmit={handleCreateAffiliate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="affiliateName">Affiliate name</Label>
                                <Input
                                    id="affiliateName"
                                    value={affiliateName}
                                    onChange={(event) => setAffiliateName(event.target.value)}
                                    placeholder="Enter affiliate name"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="affiliateEmail">Affiliate email</Label>
                                <Input
                                    id="affiliateEmail"
                                    type="email"
                                    value={affiliateEmail}
                                    onChange={(event) => setAffiliateEmail(event.target.value)}
                                    placeholder="affiliate@example.com"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="affiliateCode">Discount code</Label>
                                <Input
                                    id="affiliateCode"
                                    value={discountCode}
                                    onChange={(event) => setDiscountCode(event.target.value.toUpperCase())}
                                    placeholder="e.g. CODE20"
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit">Create Affiliate (Demo)</Button>

                        {successMessage && (
                            <div className="rounded-md border border-green-600/30 bg-green-600/10 px-3 py-2 text-sm text-green-700">
                                {successMessage}
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle>Affiliate performance list</CardTitle>
                    <CardDescription>
                        Dummy affiliates with discount-code usage and generated revenue.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-3 md:hidden">
                        {fakeAffiliates.map((affiliate) => (
                            <div key={affiliate.id} className="rounded-2xl border border-border p-3 space-y-3 shadow-sm">
                                <div>
                                    <p className="font-medium text-foreground">{affiliate.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{affiliate.email}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Code</p>
                                        <p className="font-medium text-foreground">{affiliate.discountCode}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Students</p>
                                        <p className="font-medium text-foreground">{affiliate.studentsUsedCode}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-muted-foreground">Revenue</p>
                                        <p className="font-medium text-foreground">
                                            {new Intl.NumberFormat("en-ET", {
                                                style: "currency",
                                                currency: "ETB",
                                                maximumFractionDigits: 0,
                                            }).format(affiliate.revenueETB)}
                                        </p>
                                    </div>
                                </div>

                                <Badge variant={affiliate.status === "active" ? "default" : "secondary"}>
                                    {affiliate.status}
                                </Badge>
                            </div>
                        ))}
                    </div>

                    <Table className="hidden md:table">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Affiliate</TableHead>
                                <TableHead>Discount code</TableHead>
                                <TableHead>Students used code</TableHead>
                                <TableHead>Revenue generated</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fakeAffiliates.map((affiliate) => (
                                <TableRow key={affiliate.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{affiliate.name}</p>
                                            <p className="text-xs text-muted-foreground">{affiliate.email}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center gap-1">
                                            <TicketPercent className="h-4 w-4 text-muted-foreground" />
                                            {affiliate.discountCode}
                                        </span>
                                    </TableCell>
                                    <TableCell>{affiliate.studentsUsedCode}</TableCell>
                                    <TableCell>
                                        {new Intl.NumberFormat("en-ET", {
                                            style: "currency",
                                            currency: "ETB",
                                            maximumFractionDigits: 0,
                                        }).format(affiliate.revenueETB)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={affiliate.status === "active" ? "default" : "secondary"}>
                                            {affiliate.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
