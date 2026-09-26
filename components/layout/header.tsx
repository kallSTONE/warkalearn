'use client'

import { useState, useEffect } from 'react'
import TransitionLink from '@/components/transition-link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import {
  GraduationCap, BookOpen, Users, ShoppingBag,
  Menu, X, Sun, Moon, ChevronDown, Check, ShoppingCart
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useSupabase } from '@/components/providers/supabase-provider'
import { UserNav } from '@/components/user-nav'
import Lg from '@/public/assets/images/warkalogo.png'
import { useLanguage } from '@/components/providers/language-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const localeLabels: Record<'en' | 'am' | 'es', string> = {
  en: 'EN',
  am: 'አማ',
  es: 'ES',
}

const localeOptions = [
  { value: 'en', labelKey: 'language.english', fallback: 'English' },
  { value: 'am', labelKey: 'language.amharic', fallback: 'Amharic' },
  { value: 'es', labelKey: 'language.spanish', fallback: 'Spanish' },
] as const

const baseNavigation = [
  { id: 'home', labelKey: 'nav.home', fallback: 'Home', href: '/' },
  { id: 'courses', labelKey: 'nav.courses', fallback: 'Courses', href: '/learn' },
  { id: 'community', labelKey: 'nav.community', fallback: 'Community', href: '/community' },
  { id: 'shop', labelKey: 'nav.shop', fallback: 'Shop', href: '/shop' },
  { id: 'free', labelKey: 'nav.free', fallback: 'Free', href: '/resources' },
  { id: 'about', labelKey: 'nav.about', fallback: 'About', href: '/about' },
  { id: 'my-account', labelKey: 'nav.myAccount', fallback: 'My Account', href: '/dashboard' },
]

function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Avoid hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme" className="opacity-0 pointer-events-none">
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')
  const { user, supabase } = useSupabase()
  const { locale, setLocale, t } = useLanguage()
  const lawyerExcludedIds = ['community', 'about']
  const adminExcludedIds = ['my-account']
  const navigation = user?.user_metadata?.role === 'lawyer'
    ? [...baseNavigation, { id: 'referral-rewards', labelKey: 'nav.referralRewards', fallback: 'Referral Rewards', href: '/dashboard/referrals' }]
    : baseNavigation

  const filteredNavigation = navigation.filter((item) => {
    if (!user) {
      return !adminExcludedIds.includes(item.id)
    }

    // Admin → show everything except my-account
    if (user?.user_metadata?.role === 'admin') {
      return !adminExcludedIds.includes(item.id)
    }

    // Lawyer → exclude specific links
    if (user?.user_metadata?.role === 'lawyer') {
      return !lawyerExcludedIds.includes(item.id)
    }

    return true
  })


  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const loadCartCount = async () => {
      if (!user || user.user_metadata?.role !== 'lawyer') {
        setCartCount(0)
        return
      }

      const { count, error } = await supabase
        .from('shop_cart_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (error) {
        console.error('Failed to load cart count:', error)
        setCartCount(0)
        return
      }

      setCartCount(count ?? 0)
    }

    void loadCartCount()
  }, [supabase, user])

  return (
    <header className={cn(
      'sticky top-0 z-50 transition-all duration-300',
      scrolled || isAdminRoute
        ? 'bg-background/75 backdrop-blur-md border-b border-border shadow-sm'
        : 'bg-transparent'
    )}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <TransitionLink href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
            <Image src={Lg} alt="Warka Learn logo" className="h-[40px] w-auto " />
          </TransitionLink>
        </div>

        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-muted-foreground"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="hidden lg:flex lg:gap-x-8">
          {filteredNavigation.map((item) => (
            <TransitionLink
              key={item.id}
              href={item.href}
              className={cn(
                "text-sm font-semibold leading-6 transition-colors",
                pathname === item.href
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(item.labelKey, item.fallback)}
            </TransitionLink>
          ))}
        </div>


        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-4 items-center">
          {user?.user_metadata?.role === 'lawyer' ? (
            <Button variant="ghost" size="icon" asChild className="relative" aria-label="Open orders">
              <TransitionLink href="/dashboard/orders" target="_blank" rel="noopener noreferrer">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {cartCount}
                  </span>
                ) : null}
              </TransitionLink>
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('language.toggle.aria', 'Switch language')}
                className="font-semibold"
              >
                {localeLabels[locale]}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[9rem]">
              {localeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => setLocale(option.value)}
                  className="flex items-center justify-between"
                >
                  <span>{t(option.labelKey, option.fallback)}</span>
                  {locale === option.value ? <Check className="h-4 w-4" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggleButton />

          {user ? (
            <UserNav />
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" asChild>
                <TransitionLink href="/login">{t('auth.login', 'Log in')}</TransitionLink>
              </Button>
              <Button asChild>
                <TransitionLink href="/register">{t('auth.signup', 'Sign up')}</TransitionLink>
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-background px-6 py-6 sm:max-w-sm">
            <div className="flex items-center justify-between mb-6">
              <TransitionLink href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
                <Image src={Lg} alt="Warka Learn logo" className="h-[25px] w-auto " />
              </TransitionLink>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-muted-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-border">
                <div className="flex flex-col lg:gap-x-8">
                  {filteredNavigation.map((item) => (
                    <TransitionLink
                      key={item.id}
                      href={item.href}
                      className={cn(
                        "text-sm font-semibold leading-6 transition-colors",
                        pathname === item.href
                          ? "text-primary font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t(item.labelKey, item.fallback)}
                    </TransitionLink>
                  ))}
                </div>

                <div className="py-6 space-y-4 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    {user?.user_metadata?.role === 'lawyer' ? (
                      <Button variant="ghost" size="icon" asChild className="relative" aria-label="Open orders">
                        <TransitionLink href="/dashboard/orders" target="_blank" rel="noopener noreferrer">
                          <ShoppingCart className="h-5 w-5" />
                          {cartCount > 0 ? (
                            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                              {cartCount}
                            </span>
                          ) : null}
                        </TransitionLink>
                      </Button>
                    ) : null}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t('language.toggle.aria', 'Switch language')}
                          className="font-semibold"
                        >
                          {localeLabels[locale]}
                          <ChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[9rem]">
                        {localeOptions.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onSelect={() => setLocale(option.value)}
                            className="flex items-center justify-between"
                          >
                            <span>{t(option.labelKey, option.fallback)}</span>
                            {locale === option.value ? <Check className="h-4 w-4" /> : null}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ThemeToggleButton />
                  </div>

                  {user ? (
                    <UserNav />
                  ) : (
                    <div className="flex flex-col gap-2 w-full">
                      <Button variant="outline" asChild className="w-full">
                        <TransitionLink href="/login" onClick={() => setMobileMenuOpen(false)}>{t('auth.login', 'Log in')}</TransitionLink>
                      </Button>
                      <Button asChild className="w-full">
                        <TransitionLink href="/register" onClick={() => setMobileMenuOpen(false)}>{t('auth.signup', 'Sign up')}</TransitionLink>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}