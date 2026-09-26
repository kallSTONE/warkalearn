"use client"

import type React from "react"
import { useState, useEffect } from "react"
import TransitionLink from "@/components/transition-link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePathname, useRouter } from "next/navigation"
import {
  LogOut,
  Settings,
  Menu,
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  BarChart3,
  ShoppingBag,
  ListChecks,
  Palette,
  Gift,
  Handshake,
  Award,
  CalendarDays,
} from "lucide-react"
import { useSupabase } from "@/components/providers/supabase-provider"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, supabase, signOut } = useSupabase()
  const [loading, setLoading] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const menuItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Courses", href: "/admin/courses", icon: BookOpen },
    { label: "Shop", href: "/admin/shop", icon: ShoppingBag },
    { label: "Students", href: "/admin/students", icon: Users },
    { label: "Referrals", href: "/admin/analytics/referrals", icon: Gift },
    { label: "Affiliates", href: "/admin/analytics/affiliates", icon: Handshake },
    { label: "Articles", href: "/admin/articles", icon: FileText },
    { label: "Revenue", href: "/admin/analytics", icon: BarChart3 },
    { label: "Quizzes", href: "/admin/quizzes", icon: ListChecks },
    { label: "Certifications", href: "/admin/certifications", icon: Award },
    { label: "Live Classes", href: "/admin/live-classes", icon: CalendarDays },
    { label: "Customization", href: "/admin/customization", icon: Palette },

  ]

  const isActiveRoute = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href
    }

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const navButtonClassName = (active: boolean) =>
    cn(
      "w-full items-center justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
      active
        ? "text-accent"
        : "text-sidebar-foreground hover:bg-muted/40 hover:text-foreground"
    )

  // -------------------------
  // AUTH: HANDLE LOADING + REDIRECTS
  // -------------------------
  useEffect(() => {
    // Supabase loads user asynchronously, so wait until it resolves.
    if (user !== undefined) {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login")
      } else if (user?.user_metadata?.role !== "admin") {
        router.replace("/login")
      }
    }
  }, [loading, user, router])

  // -------------------------
  // LOADING STATE
  // -------------------------
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <p className="text-gray-600">Checking your session…</p>
      </div>
    )
  }

  // -------------------------
  // LOGOUT HANDLER
  // -------------------------
  const handleLogout = async () => {
    await signOut()
    window.location.href = "/login"
  }

  // -------------------------
  // RENDER ADMIN UI
  // -------------------------

  if (user?.user_metadata?.role !== "admin")
    return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <div className="h-full flex flex-col bg-background">
            <div className="px-4 py-4 border-b border-sidebar-border">
              <SheetTitle className="text-base">Admin Menu</SheetTitle>
            </div>

            <nav className="flex-1 p-3 space-y-2">
              {menuItems.map((item) => (
                <TransitionLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  aria-current={isActiveRoute(item.href) ? "page" : undefined}
                >
                  <Button
                    variant="ghost"
                    className={navButtonClassName(isActiveRoute(item.href))}
                  >
                    <item.icon size={18} className="mr-2 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Button>
                </TransitionLink>
              ))}
            </nav>

            <div className="p-3 border-t border-sidebar-border space-y-2">
              <Button
                asChild
                variant="ghost"
                className={navButtonClassName(isActiveRoute("/admin/customization"))}
              >
                <TransitionLink href="/admin/customization" onClick={() => setMobileNavOpen(false)}>
                  <Settings size={18} className="mr-2 flex-shrink-0" />
                  <span>Settings</span>
                </TransitionLink>
              </Button>

              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-muted/40 hover:text-red-600"
              >
                <LogOut size={18} className="mr-2 flex-shrink-0" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sidebar */}
      <aside
        className={`
          group fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)]
          bg-background border-r border-sidebar-border
          transition-all duration-300
          w-[60px] hover:w-64
          lg:flex flex-col
        `}
      >
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <TransitionLink key={item.href} href={item.href} aria-current={isActiveRoute(item.href) ? "page" : undefined}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full flex items-center gap-3 rounded-xs px-3 py-2.5 text-sidebar-foreground justify-center transition-all duration-200 group-hover:justify-start",
                  isActiveRoute(item.href)
                    ? "text-accent"
                    : "hover:bg-muted/30 hover:text-primary"
                )}
              >
                <item.icon size={20} className="flex-shrink-0" />
                <span className={cn("ml-0 hidden whitespace-nowrap text-sm font-medium group-hover:inline-block", isActiveRoute(item.href) && "text-accent")}>
                  {item.label}
                </span>
              </Button>
            </TransitionLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-2 bg-sidebar">
          <Button
            asChild
            variant="ghost"
            className={`
              relative w-full flex items-center gap-3 justify-center px-3 py-2.5 rounded-xl
              group-hover:justify-start text-sidebar-foreground
              transition-all duration-200 rounded-md
              hover:bg-muted/30 hover:text-primary
              before:absolute before:left-0 before:top-0 before:h-full before:w-1
              before:bg-transparent hover:before:bg-primary
            `}
          >
            <TransitionLink href="/admin/customization">
              <Settings size={20} className="flex-shrink-0" />
              <span className="ml-0 hidden whitespace-nowrap text-sm font-medium group-hover:inline-block">
                Settings
              </span>
            </TransitionLink>
          </Button>

          <Button
            onClick={handleLogout}
            variant="ghost"
            className={`
              relative w-full flex items-center gap-3 justify-center px-3 py-2.5 rounded-xl
              group-hover:justify-start text-sidebar-foreground
              transition-all duration-200 rounded-md
              hover:bg-muted/30 hover:text-red-600
              before:absolute before:left-0 before:top-0 before:h-full before:w-1
              before:bg-transparent hover:before:bg-red-600
            `}
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span className="ml-0 hidden whitespace-nowrap text-sm font-medium group-hover:inline-block">
              Logout
            </span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-h-screen flex-1 flex-col pt-0 lg:pl-6 transition-all duration-300">

        {/* Children content */}
        <main className="flex-1 bg-background p-4 md:p-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
