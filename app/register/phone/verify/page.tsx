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
import { Loader2 } from 'lucide-react'
import { resolvePostLoginRedirect } from '@/lib/auth-redirect'
import { useLanguage } from '@/components/providers/language-provider'

const DEFAULT_RESEND_SECONDS = 60

function mapInlineError(rawMessage: string, fallback: string, t: (key: string, fallback?: string) => string): string {
    const normalized = rawMessage.toLowerCase()

    if (
        normalized.includes('invalid verification code') ||
        normalized.includes('invalid otp') ||
        normalized.includes('token has expired') ||
        normalized.includes('token is invalid') ||
        normalized.includes('otp has expired')
    ) {
        return t('auth.verify.error.incorrectCode', 'Incorrect code')
    }

    return rawMessage || fallback
}

export default function PhoneRegisterVerifyPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user, loading, supabase } = useSupabase()
    const { startLoading } = useRouteLoading()
    const { t } = useLanguage()

    const ticketToken = searchParams.get('ticket') ?? ''
    const phone = searchParams.get('phone') ?? ''
    const maskedPhone = searchParams.get('masked') ?? phone
    const retryParam = Number(searchParams.get('retry') ?? DEFAULT_RESEND_SECONDS)

    const [otp, setOtp] = useState('')
    const [lastAutoSubmittedOtp, setLastAutoSubmittedOtp] = useState('')
    const [resendSeconds, setResendSeconds] = useState(
        Number.isFinite(retryParam) ? retryParam : DEFAULT_RESEND_SECONDS
    )
    const [isVerifying, setIsVerifying] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [info, setInfo] = useState<string | null>(null)

    useEffect(() => {
        if (!ticketToken || !phone) {
            router.replace('/register')
        }
    }, [ticketToken, phone, router])

    useEffect(() => {
        if (!loading && user) {
            const redirectPath = resolvePostLoginRedirect(user?.user_metadata?.role)
            startLoading()
            router.replace(redirectPath)
        }
    }, [loading, user, router, startLoading])

    useEffect(() => {
        if (resendSeconds <= 0) return

        const timer = setTimeout(() => {
            setResendSeconds((previous) => Math.max(previous - 1, 0))
        }, 1000)

        return () => clearTimeout(timer)
    }, [resendSeconds])

    const handleVerifyOtp = async (otpCode: string) => {
        if (otpCode.length !== 6 || isVerifying || !ticketToken || !phone) {
            return
        }

        setError(null)
        setInfo(null)
        setIsVerifying(true)

        try {
            const verifyResponse = await fetch('/api/auth/phone/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone,
                    otp: otpCode,
                    purpose: 'register',
                }),
            })

            const verifyPayload = await verifyResponse.json().catch(() => ({}))

            if (!verifyResponse.ok) {
                const apiError = String(verifyPayload?.error ?? '')
                throw new Error(
                    mapInlineError(apiError, t('auth.verify.error.unableVerify', 'Unable to verify code right now.'), t)
                )
            }

            const registerResponse = await fetch('/api/auth/phone/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketToken,
                    redirectTo:
                        typeof window !== 'undefined'
                            ? `${window.location.origin}/auth/callback`
                            : undefined,
                }),
            })

            const registerPayload = await registerResponse.json().catch(() => ({}))

            if (!registerResponse.ok) {
                const apiError = String(registerPayload?.error ?? '')
                throw new Error(
                    mapInlineError(apiError, t('auth.verify.error.completeRegistration', 'Unable to complete registration.'), t)
                )
            }

            const magicLinkTokenHash =
                typeof registerPayload?.magicLinkTokenHash === 'string'
                    ? registerPayload.magicLinkTokenHash
                    : null

            if (magicLinkTokenHash) {
                const { error: magicLinkError } = await supabase.auth.verifyOtp({
                    token_hash: magicLinkTokenHash,
                    type: 'magiclink',
                })

                if (magicLinkError) {
                    throw magicLinkError
                }
            }

            setInfo(t('auth.verify.info.verified', 'Phone verified. Finishing your account setup...'))
        } catch (verifyError: any) {
            setError(mapInlineError(verifyError?.message ?? '', t('auth.verify.error.incorrectCode', 'Incorrect code'), t))
        } finally {
            setIsVerifying(false)
        }
    }

    useEffect(() => {
        if (otp.length !== 6) return
        if (isVerifying || lastAutoSubmittedOtp === otp) return

        setLastAutoSubmittedOtp(otp)
        void handleVerifyOtp(otp)
    }, [otp, isVerifying, lastAutoSubmittedOtp])

    const handleResend = async () => {
        if (resendSeconds > 0 || isResending || !phone) {
            return
        }

        setError(null)
        setInfo(null)
        setIsResending(true)

        try {
            const response = await fetch('/api/auth/phone/request-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone,
                    purpose: 'register',
                }),
            })

            const payload = await response.json().catch(() => ({}))

            if (!response.ok) {
                const apiError = String(payload?.error ?? '')
                throw new Error(mapInlineError(apiError, t('auth.verify.error.resendFailed', 'Unable to resend code.'), t))
            }

            setResendSeconds(
                typeof payload?.retryAfterSeconds === 'number'
                    ? payload.retryAfterSeconds
                    : DEFAULT_RESEND_SECONDS
            )
            setInfo(`${t('auth.verify.info.codeSentPrefix', 'A new code was sent to')} ${payload?.maskedPhone ?? maskedPhone}.`)
        } catch (resendError: any) {
            setError(mapInlineError(resendError?.message ?? '', t('auth.verify.error.resendFailed', 'Unable to resend code.'), t))
        } finally {
            setIsResending(false)
        }
    }

    return (
        <div className="max-w-md mx-auto py-12 px-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl text-center">{t('auth.verify.title', 'Verify your phone')}</CardTitle>
                    <CardDescription className="text-center">
                        {t('auth.verify.subtitlePrefix', 'Enter the 6-digit code sent to')} {maskedPhone}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    {info && (
                        <div className="bg-primary/10 text-primary text-sm p-3 rounded-md">{info}</div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="otp">{t('auth.verify.codeLabel', '6-digit code')}</Label>
                        <div className="flex justify-center">
                            <InputOTP
                                id="otp"
                                maxLength={6}
                                value={otp}
                                onChange={setOtp}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoFocus
                                disabled={isVerifying || isResending}
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
                    </div>

                    <Button
                        type="button"
                        className="w-full"
                        onClick={() => void handleVerifyOtp(otp)}
                        disabled={isVerifying || isResending || otp.length !== 6}
                    >
                        {isVerifying ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('auth.verify.action.verifying', 'Verifying...')}
                            </>
                        ) : (
                            t('auth.verify.action.verifyFinish', 'Verify and finish signup')
                        )}
                    </Button>

                    <div className="text-center text-sm">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleResend}
                            disabled={resendSeconds > 0 || isResending || isVerifying}
                        >
                            {isResending
                                ? t('auth.verify.action.resending', 'Resending...')
                                : resendSeconds > 0
                                    ? `${t('auth.verify.action.resendIn', 'Resend in')} ${resendSeconds}s`
                                    : t('auth.verify.action.resendCode', 'Resend code')}
                        </Button>
                    </div>
                </CardContent>

                <CardFooter className="flex justify-center">
                    <div className="text-sm text-muted-foreground">
                        {t('auth.verify.changeDetails', 'Need to change details?')}{' '}
                        <TransitionLink href="/register" className="text-primary hover:underline">
                            {t('auth.verify.backToSignup', 'Back to signup')}
                        </TransitionLink>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}