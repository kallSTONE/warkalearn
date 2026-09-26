"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogOut, Settings, LayoutDashboard, BookOpen, FileText, ListChecks } from "lucide-react"
import { useSupabase } from "@/components/providers/supabase-provider"
import { useRouter } from "next/navigation"

export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const { user, signOut } = useSupabase()
    const [loading, setLoading] = useState(true)

    const menuItems = [
        { label: "Dashboard", href: "/reviewer", icon: LayoutDashboard },
        { label: "All Courses", href: "/reviewer/courses", icon: BookOpen },
        { label: "Drafts", href: "/reviewer/drafts", icon: FileText },
        { label: "Notes", href: "/reviewer/notes", icon: ListChecks },
    ]

    useEffect(() => {
        if (user !== undefined) {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace("/login")
            } else if (user?.user_metadata?.role !== "reviewer") {
                router.replace("/")
            }
        }
    }, [loading, user, router])

    if (loading) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <p className="text-gray-600">Checking your session…</p>
            </div>
        )
    }

    const handleLogout = async () => {
        await signOut()
        window.location.href = "/login"
    }

    if (user?.user_metadata?.role !== "reviewer") return null

    return (
        <div className="relative h-screen flex bg-background overflow-hidden">
            {/* Sidebar */}
            <aside className="group fixed top-0 left-0 h-full z-50 bg-background border-r border-sidebar-border transition-all duration-300 w-[60px] hover:w-64 flex flex-col">
                <div className="px-6 py-10 border-b border-sidebar-border">
                    <h1 className="font-bold text-lg text-sidebar-foreground">
                        <span className="block group-hover:hidden text-center"></span>
                        <span className="hidden group-hover:block text-xl"></span>
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {menuItems.map((item) => (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant="ghost"
                                className="relative w-full flex items-center text-sidebar-foreground justify-center group-hover:justify-start transition-all duration-200 rounded-md hover:bg-muted/30 hover:text-primary before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-transparent hover:before:bg-primary"
                            >
                                <item.icon size={20} className="flex-shrink-0" />
                                <span className="ml-3 hidden group-hover:inline-block whitespace-nowrap">{item.label}</span>
                            </Button>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-sidebar-border space-y-2 bg-sidebar">
                    <Button
                        variant="ghost"
                        className="relative w-full flex items-center justify-center group-hover:justify-start text-sidebar-foreground transition-all duration-200 rounded-md hover:bg-muted/30 hover:text-primary before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-transparent hover:before:bg-primary"
                    >
                        <Settings size={20} className="flex-shrink-0" />
                        <span className="ml-3 hidden group-hover:inline-block whitespace-nowrap">Settings</span>
                    </Button>

                    <Button
                        onClick={handleLogout}
                        variant="ghost"
                        className="relative w-full flex items-center justify-center group-hover:justify-start text-sidebar-foreground transition-all duration-200 rounded-md hover:bg-muted/30 hover:text-red-600 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-transparent hover:before:bg-red-600"
                    >
                        <LogOut size={20} className="flex-shrink-0" />
                        <span className="ml-3 hidden group-hover:inline-block whitespace-nowrap">Logout</span>
                    </Button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col ml-20 transition-all duration-300">
                <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{user?.email}</span>
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                            {user?.email?.[0]?.toUpperCase()}
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-auto bg-background p-6">{children}</main>
            </div>
        </div>
    )
}
