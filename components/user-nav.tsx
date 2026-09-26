'use client'
  
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {   
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator, 
  DropdownMenuTrigger, 
} from "@/components/ui/dropdown-menu"
import { useSupabase } from "@/components/providers/supabase-provider"
import { User, Settings, LogOut, BookOpen, MessageSquare, ShoppingBag } from "lucide-react"
import TransitionLink from "@/components/transition-link"
  
     
export function UserNav() {
  const { user, signOut } = useSupabase()
     
  if (!user) return null   
      
  const userInitials = user.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U'
     
  const dashboardHref =
    user?.user_metadata?.role === "admin"
      ? "/admin/dashboard"
      : user?.user_metadata?.role === "reviewer"
        ? "/reviewer"
        : "/dashboard"; // lawyer + fallback
      
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || ''} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <TransitionLink href={dashboardHref} className="flex w-full cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </TransitionLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <TransitionLink href="/dashboard/" className="flex w-full cursor-pointer">
              <BookOpen className="mr-2 h-4 w-4" />
              <span>My Courses</span>
            </TransitionLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <TransitionLink href="/dashboard/orders" className="flex w-full cursor-pointer">
              <ShoppingBag className="mr-2 h-4 w-4" />
              <span>My Orders</span>
            </TransitionLink> 
          </DropdownMenuItem> 
        </DropdownMenuGroup> 
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <TransitionLink href="/dashboard/" className="flex w-full cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </TransitionLink>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            window.location.href = "/login"; // Redirect after logout
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )   
}   