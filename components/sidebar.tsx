"use client"

import TransitionLink from "@/components/transition-link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, BookOpen, Users, FileText, BarChart3, ChevronLeft } from "lucide-react"
import { motion } from "framer-motion"

interface SidebarProps {
  open: boolean
  onToggle: () => void
}

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/articles", label: "Articles", icon: FileText },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
]

export function Sidebar({ open, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <motion.aside
      initial={{ width: open ? 256 : 80 }}
      animate={{ width: open ? 256 : 80 }}
      transition={{ duration: 0.3 }}
      className="bg-sidebar border-r border-sidebar-border flex flex-col"
    >
      <div className="p-4 flex items-center justify-between">
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="font-bold text-lg text-sidebar-foreground"
          >
            Tesfa
          </motion.div>
        )}
        <button onClick={onToggle} className="p-1 hover:bg-sidebar-accent rounded-lg transition-colors">
          <ChevronLeft className={cn("w-5 h-5 text-sidebar-foreground transition-transform", !open && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <TransitionLink
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {open && <span className="text-sm font-medium">{item.label}</span>}
            </TransitionLink>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/60">{open && <p>© 2025 Tesfa</p>}</div>
      </div>
    </motion.aside>
  )
}
