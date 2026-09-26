'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DEFAULT_LOCALE,
  LANGUAGE_COOKIE_KEY,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  Locale,
  normalizeLocale,
  translate,
} from '@/lib/i18n'

type LanguageContextType = {
  locale: Locale
  setLocale: (nextLocale: Locale) => void
  toggleLocale: () => void
  t: (key: string, fallback?: string) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie ? document.cookie.split('; ') : []
  for (const row of cookies) {
    const [key, ...rest] = row.split('=')
    if (key === name) {
      return decodeURIComponent(rest.join('='))
    }
  }
  return null
}

function persistLocale(nextLocale: Locale) {
  if (typeof document !== 'undefined') {
    document.cookie = `${LANGUAGE_COOKIE_KEY}=${encodeURIComponent(nextLocale)}; path=/; max-age=31536000; samesite=lax`
    document.documentElement.lang = nextLocale
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale)
  }
}

function detectBrowserLocale(): Locale | null {
  if (typeof navigator === 'undefined') return null

  const languages = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language]

  for (const raw of languages) {
    const parsed = normalizeLocale(raw)
    if (parsed) {
      return parsed
    }
  }

  return null
}

function getNextLocale(currentLocale: Locale): Locale {
  const currentIndex = SUPPORTED_LOCALES.indexOf(currentLocale)
  return SUPPORTED_LOCALES[(currentIndex + 1) % SUPPORTED_LOCALES.length]
}

export function LanguageProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [showFirstVisitModal, setShowFirstVisitModal] = useState(false)

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale)
    persistLocale(nextLocale)
    setShowFirstVisitModal(false)
  }

  const toggleLocale = () => {
    setLocale(getNextLocale(locale))
  }

  useEffect(() => {
    const cookieLocale = normalizeLocale(readCookie(LANGUAGE_COOKIE_KEY))
    const storageLocale = typeof window !== 'undefined'
      ? normalizeLocale(window.localStorage.getItem(LANGUAGE_STORAGE_KEY))
      : null

    const storedLocale = cookieLocale ?? storageLocale

    if (storedLocale) {
      if (storedLocale !== locale) {
        setLocaleState(storedLocale)
      }
      persistLocale(storedLocale)
      return
    }

    const browserLocale = detectBrowserLocale()
    if (browserLocale) {
      setLocaleState(browserLocale)
      persistLocale(browserLocale)
      return
    }

    setLocaleState(DEFAULT_LOCALE)
    setShowFirstVisitModal(true)
  }, [])

  const value = useMemo<LanguageContextType>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t: (key: string, fallback?: string) => translate(locale, key, fallback),
    }),
    [locale]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}

      <AlertDialog open={showFirstVisitModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{value.t('language.select.title', 'Choose your language')}</AlertDialogTitle>
            <AlertDialogDescription>
              {value.t('language.select.description', 'Select a language to continue.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex w-full gap-3 sm:justify-start sm:space-x-0">
            <Button onClick={() => setLocale('en')} className="w-full sm:w-auto">{value.t('language.english', 'English')}</Button>
            <Button onClick={() => setLocale('am')} variant="outline" className="w-full sm:w-auto">{value.t('language.amharic', 'Amharic')}</Button>
            <Button onClick={() => setLocale('es')} variant="outline" className="w-full sm:w-auto">{value.t('language.spanish', 'Spanish')}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
