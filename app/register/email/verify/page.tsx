'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import TransitionLink from '@/components/transition-link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useSupabase } from '@/components/providers/supabase-provider'
import { useRouteLoading } from '@/components/route-loading-provider'
import { Loader2, Mail } from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'

const DEFAULT_RESEND_SECONDS = 60

export default function EmailRegisterVerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn } = useSupabase()
  const { startLoading } = useRouteLoading()
  const { t } = useLanguage()

  const ticketToken = searchParams.get('ticket') ?? ''
  const email = searchParams.get('email') ?? ''
  const maskedEmail = searchParams.get('masked') ?? email
  const retryParam = Number(searchParams.get('retry') ?? DEFAULT_RESEND_SECONDS)

  const [otp, setOtp] = useState('')
  const [resendSeconds, setResendSeconds] = useState(
    Number.isFinite(retryParam) ? retryParam : DEFAULT_RESEND_SECONDS
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendNotice, setResendNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!ticketToken || !email) {
      router.replace('/register')
    }
  }, [ticketToken, email, router])

  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendSeconds])

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify ?? otp).trim()
    if (code.length < 6) {
      setError(t('auth.verify.error.incompleteCode', 'Please enter the 6-digit verification code.'))
      return
    }

    setError(null)
    setResendNotice(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/email/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketToken,
          otp: code,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || t('auth.verify.error.failed', 'Verification failed.'))
      }

      // Automatically sign in with credentials
      if (data.email && data.password) {
        await signIn(data.email, data.password)
      }

      startLoading()
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please check the code and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (resendSeconds > 0 || isResending) return

    setError(null)
    setResendNotice(null)
    setIsResending(true)

    try {
      const response = await fetch('/api/auth/email/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketToken,
          email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to resend code.')
      }

      setResendSeconds(data.retryAfterSeconds ?? DEFAULT_RESEND_SECONDS)
      setResendNotice(t('auth.verify.notice.codeSent', 'A new verification code has been sent to your email.'))
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {t('auth.verify.email.title', 'Verify Your Email')}
          </CardTitle>
          <CardDescription className="text-sm">
            {t('auth.verify.email.subtitle', 'We sent a 6-digit verification code to')}
            <br />
            <span className="font-semibold text-foreground">{maskedEmail || email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleVerify()
            }}
            className="space-y-4"
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <Label htmlFor="email-otp-input" className="sr-only">
                {t('auth.verify.inputLabel', 'Verification code')}
              </Label>
              <InputOTP
                id="email-otp-input"
                maxLength={6}
                value={otp}
                onChange={(val) => {
                  setOtp(val)
                  if (val.length === 6) {
                    void handleVerify(val)
                  }
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive text-center">
                {error}
              </div>
            )}

            {resendNotice && (
              <div className="rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-600 dark:text-emerald-400 text-center">
                {resendNotice}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || otp.length < 6}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.verify.action.verifying', 'Verifying...')}
                </>
              ) : (
                t('auth.verify.action.submit', 'Verify & Create Account')
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            {resendSeconds > 0 ? (
              <p className="text-muted-foreground">
                {t('auth.verify.resendTimer', 'Resend code in')}{' '}
                <span className="font-medium text-foreground">{resendSeconds}s</span>
              </p>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    {t('auth.verify.action.resending', 'Sending...')}
                  </>
                ) : (
                  t('auth.verify.action.resend', 'Resend code')
                )}
              </Button>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border pt-4 text-xs text-muted-foreground">
          <TransitionLink href="/register" className="hover:underline">
            {t('auth.verify.action.backToRegister', 'Use a different email or phone')}
          </TransitionLink>
        </CardFooter>
      </Card>
    </div>
  )
}

