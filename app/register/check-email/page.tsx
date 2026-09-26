'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import TransitionLink from '@/components/transition-link'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { maskEmail } from '@/lib/auth-identifier'
import { useLanguage } from '@/components/providers/language-provider'

export default function RegisterCheckEmailPage() {
    const { t } = useLanguage()
    const searchParams = useSearchParams()
    const email = (searchParams.get('email') ?? '').trim().toLowerCase()

    const masked = useMemo(() => (email ? maskEmail(email) : t('auth.checkEmail.fallbackAddress', 'your email address')), [email, t])

    return (
        <div className="max-w-md mx-auto py-12 px-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl text-center">{t('auth.checkEmail.title', 'Check your email')}</CardTitle>
                    <CardDescription className="text-center">
                        {t('auth.checkEmail.descriptionPrefix', 'We sent a confirmation link to')} {masked}.{' '}
                        {t('auth.checkEmail.descriptionSuffix', 'Open your inbox and click the link to finish signup.')}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                    <Button asChild className="w-full" variant="outline">
                        <a href="https://mail.google.com/" target="_blank" rel="noreferrer">
                            {t('auth.checkEmail.openGmail', 'Open Gmail')}
                        </a>
                    </Button>

                    <Button asChild className="w-full" variant="outline">
                        <a href="https://outlook.live.com/mail/0/" target="_blank" rel="noreferrer">
                            {t('auth.checkEmail.openOutlook', 'Open Outlook')}
                        </a>
                    </Button>

                    <Button asChild className="w-full" variant="outline">
                        <a href="https://mail.yahoo.com/" target="_blank" rel="noreferrer">
                            {t('auth.checkEmail.openYahoo', 'Open Yahoo Mail')}
                        </a>
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                        {t('auth.checkEmail.tip', 'If you don’t see the message, check spam/promotions and verify your email address.')}
                    </p>
                </CardContent>

                <CardFooter className="flex justify-center">
                    <div className="text-sm text-muted-foreground text-center">
                        {t('auth.checkEmail.verifiedPrompt', 'Already verified?')}{' '}
                        <TransitionLink href="/login" className="text-primary hover:underline">
                            {t('auth.checkEmail.continueSignIn', 'Continue to sign in')}
                        </TransitionLink>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}