'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import TransitionLink from '@/components/transition-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Loader2, Mail, Lock, User, Gift } from 'lucide-react'
import Image from 'next/image'
import Lg from '@/public/assets/images/warkalogo.png'
import { detectIdentifierKind } from '@/lib/auth-identifier'
import { useLanguage } from '@/components/providers/language-provider'

const DEFAULT_RESEND_SECONDS = 60

function mapInlineError(rawMessage: string, fallback: string, t: (key: string, fallback?: string) => string): string {
  const normalized = rawMessage.toLowerCase()

  if (normalized.includes('already exists') || normalized.includes('already registered')) {
    return t('auth.error.accountExists', 'Account already exists. Please sign in.')
  }

  if (normalized.includes('invalid phone')) {
    return t('auth.error.invalidPhone', 'Invalid phone number')
  }

  return rawMessage || fallback
}

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { supabase, signInWithGoogle } = useSupabase()
  const { t } = useLanguage()

  const [fullName, setFullName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [password, setPassword] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const identifierKind = useMemo(() => detectIdentifierKind(identifier), [identifier])

  const identifierInputMode = useMemo(() => {
    if (identifierKind === 'phone') return 'numeric'
    if (identifierKind === 'email') return 'email'
    return 'text'
  }, [identifierKind])

  useEffect(() => {
    const referral = searchParams.get('ref')
    if (referral) {
      setReferralCode(referral.toUpperCase())
    }
  }, [searchParams])

  const startPhoneRegistration = async () => {
    const response = await fetch('/api/auth/phone/start-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: identifier.trim(),
        fullName: fullName.trim(),
        password,
        referralCode: referralCode.trim() || undefined,
      }),
    })

    const startPayload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const apiError = String(startPayload?.error ?? '')
      throw new Error(mapInlineError(apiError, t('auth.register.error.startPhone', 'Unable to start phone registration.'), t))
    }

    const ticketToken =
      typeof startPayload?.ticketToken === 'string' ? startPayload.ticketToken : null
    const phone = typeof startPayload?.phone === 'string' ? startPayload.phone : null
    const maskedPhone =
      typeof startPayload?.maskedPhone === 'string' ? startPayload.maskedPhone : phone

    if (!ticketToken || !phone) {
      throw new Error(t('auth.register.error.startPhone', 'Unable to start phone registration.'))
    }

    const otpResponse = await fetch('/api/auth/phone/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        purpose: 'register',
      }),
    })

    const otpPayload = await otpResponse.json().catch(() => ({}))

    if (!otpResponse.ok) {
      const otpError = String(otpPayload?.error ?? '')
      throw new Error(mapInlineError(otpError, t('auth.register.error.sendCode', 'Unable to send verification code.'), t))
    }

    const retryAfterSeconds =
      typeof otpPayload?.retryAfterSeconds === 'number'
        ? otpPayload.retryAfterSeconds
        : DEFAULT_RESEND_SECONDS

    router.push(
      `/register/phone/verify?ticket=${encodeURIComponent(ticketToken)}&phone=${encodeURIComponent(
        phone
      )}&masked=${encodeURIComponent(maskedPhone ?? phone)}&retry=${encodeURIComponent(
        String(retryAfterSeconds)
      )}`
    )
  }

  const startEmailRegistration = async () => {
    const normalizedEmail = identifier.trim().toLowerCase()
    const metadata: Record<string, string> = {
      full_name: fullName.trim(),
    }

    if (referralCode.trim()) {
      const normalizedReferralCode = referralCode.trim().toUpperCase()
      metadata.referral_code = normalizedReferralCode

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('pendingReferralCode', normalizedReferralCode)
      }
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: metadata,
      },
    })

    if (signUpError) {
      throw signUpError
    }

    router.push(`/register/check-email?email=${encodeURIComponent(normalizedEmail)}`)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const name = fullName.trim()
    if (!name) {
      setError(t('auth.error.fullNameRequired', 'Full name is required'))
      return
    }

    const trimmedIdentifier = identifier.trim()
    const detectedKind = detectIdentifierKind(trimmedIdentifier)

    if (!detectedKind) {
      setError(
        trimmedIdentifier.includes('@')
          ? t('auth.error.invalidEmail', 'Invalid email address')
          : t('auth.error.invalidPhone', 'Invalid phone number')
      )
      return
    }

    if (password.length < 8) {
      setError(t('auth.error.passwordLength', 'Password must be at least 8 characters long'))
      return
    }

    setIsSubmitting(true)

    try {
      if (detectedKind === 'phone') {
        await startPhoneRegistration()
        return
      }

      await startEmailRegistration()
    } catch (submitError: any) {
      setError(
        mapInlineError(
          submitError?.message ?? '',
          t('auth.register.error.continue', 'Failed to continue registration'),
          t
        )
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setIsGoogleLoading(true)

    try {
      await signInWithGoogle()
    } catch (googleError: any) {
      setError(
        mapInlineError(
          googleError?.message ?? '',
          t('auth.error.continueGoogleFailed', 'Failed to continue with Google'),
          t
        )
      )
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <TransitionLink href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
              <Image src={Lg} alt="Warka Learn logo" className="h-[50px] w-auto" />
            </TransitionLink>
          </div>
          <CardTitle className="text-2xl text-center">{t('auth.register.title', 'Create your account')}</CardTitle>
          <CardDescription className="text-center">
            {t('auth.register.subtitle', 'Continue with phone OTP or email confirmation to finish signup')}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">{t('auth.field.fullName', 'Full Name')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder={t('auth.field.fullNamePlaceholder', 'Your full name')}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="pl-10"
                  autoFocus
                  required
                  disabled={isSubmitting || isGoogleLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="identifier">{t('auth.field.identifier', 'Phone number or Email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="identifier"
                  type="text"
                  inputMode={identifierInputMode}
                  placeholder={t('auth.field.identifierPlaceholder', '09XXXXXXXX or your@email.com')}
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="pl-10"
                  required
                  disabled={isSubmitting || isGoogleLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralCode">{t('auth.field.referralOptional', 'Referral code (optional)')}</Label>
              <div className="relative">
                <Gift className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="referralCode"
                  placeholder={t('auth.field.referralPlaceholder', 'e.g. BRONQ-2026')}
                  value={referralCode}
                  onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
                  className="pl-10 uppercase tracking-wide"
                  maxLength={24}
                  disabled={isSubmitting || isGoogleLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.field.password', 'Password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-10"
                  required
                  minLength={8}
                  disabled={isSubmitting || isGoogleLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('auth.field.passwordHint', 'Must be at least 8 characters')}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isGoogleLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.register.action.preparing', 'Preparing verification...')}
                </>
              ) : (
                t('auth.register.action.continueVerification', 'Continue to verification')
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isSubmitting}
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.action.redirecting', 'Redirecting...')}
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  {t('auth.action.continueGoogle', 'Continue with Google')}
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {t('auth.register.legal.prefix', 'By creating an account, you agree to our')}{' '}
              <TransitionLink href="/terms" className="text-primary hover:underline">
                {t('auth.register.legal.terms', 'Terms of Service')}
              </TransitionLink>{' '}
              {t('auth.register.legal.and', 'and')}{' '}
              <TransitionLink href="/privacy" className="text-primary hover:underline">
                {t('auth.register.legal.privacy', 'Privacy Policy')}
              </TransitionLink>
              .
            </p>
          </CardContent>
        </form>

        <CardFooter className="flex justify-center">
          <div className="text-sm text-muted-foreground">
            {t('auth.register.hasAccount', 'Already have an account?')}{' '}
            <TransitionLink href="/login" className="text-primary hover:underline">
              {t('auth.login.action.signIn', 'Sign in')}
            </TransitionLink>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}