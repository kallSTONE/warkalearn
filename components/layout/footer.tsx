"use client"

import Link from 'next/link'
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import Lg from '@/public/assets/images/warkalogo.png'

import TransitionLink from '@/components/transition-link'
import { useLanguage } from '@/components/providers/language-provider'

const footerLinks = [
  {
    titleKey: 'footer.section.learning',
    fallback: 'Learning',
    links: [
      { nameKey: 'footer.link.courses', fallback: 'Courses', href: '/learn' },
      { nameKey: 'footer.link.programs', fallback: 'Programs', href: '/learn/programs' },
      { nameKey: 'footer.link.resources', fallback: 'Resources', href: '/resources' },
      { nameKey: 'footer.link.community', fallback: 'Community', href: '/community' },
      { nameKey: 'footer.link.shop', fallback: 'Shop', href: '/shop' },
    ],
  },
  {
    titleKey: 'footer.section.explore',
    fallback: 'Explore',
    links: [
      { nameKey: 'footer.link.about', fallback: 'About', href: '/about' },
      { nameKey: 'footer.link.blog', fallback: 'Blog', href: '/blog' },
      { nameKey: 'footer.link.successStories', fallback: 'Success Stories', href: '/' },
      { nameKey: 'footer.link.startLearning', fallback: 'Start Learning', href: '/learn' },
      { nameKey: 'footer.link.browseCourses', fallback: 'Browse Courses', href: '/learn' },
    ],
  },
  {
    titleKey: 'footer.section.account',
    fallback: 'Account',
    links: [
      { nameKey: 'footer.link.signIn', fallback: 'Sign In', href: '/login' },
      { nameKey: 'footer.link.signUp', fallback: 'Sign Up', href: '/register' },
      { nameKey: 'footer.link.dashboard', fallback: 'Dashboard', href: '/dashboard' },
    ],
  },
]

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-muted/40 sticky">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
              <Image src={Lg} alt="Warka Learn logo" className="h-[30px] w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t('footer.brand.description', 'Warka Learn helps learners build real-world skills across tech, language, and business with expert mentors, practical projects, and flexible programs.')}
            </p>
            <div className="flex space-x-5">
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              {footerLinks.slice(0, 2).map((group) => (
                <div key={group.fallback} className="mt-10 md:mt-0">
                  <h3 className="text-sm font-semibold">{t(group.titleKey, group.fallback)}</h3>
                  <ul className="mt-4 space-y-3">
                    {group.links.map((link) => (
                      <li key={link.fallback}>
                        <TransitionLink href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                          {t(link.nameKey, link.fallback)}
                        </TransitionLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                {footerLinks.slice(2, 3).map((group) => (
                  <div key={group.fallback}>
                    <h3 className="text-sm font-semibold">{t(group.titleKey, group.fallback)}</h3>
                    <ul className="mt-4 space-y-3">
                      {group.links.map((link) => (
                        <li key={link.fallback}>
                          <TransitionLink href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                            {t(link.nameKey, link.fallback)}
                          </TransitionLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold">{t('footer.section.contact', 'Contact')}</h3>
                <ul className="mt-4 space-y-3">
                  <li>
                    <a href="mailto:hello@bronqenglish.com" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      hello@bronqenglish.com
                    </a>
                  </li>
                  <li>
                    <a href="tel:+251911234567" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      +251 911 234 567
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {t('footer.contact.address', 'Addis Ababa, Ethiopia')}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-8">
            <div className="max-w-md">
              <h3 className="text-sm font-semibold mb-3">{t('footer.subscribe.title', 'Subscribe to Warka Learn updates')}</h3>
              <div className="flex gap-2">
                <Input
                  placeholder={t('footer.subscribe.placeholder', 'Your email address')}
                  type="email"
                  className="max-w-xs"
                />
                <Button>{t('footer.subscribe.button', 'Subscribe')}</Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {t('footer.copyright', 'Warka Learn. All rights reserved.')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}