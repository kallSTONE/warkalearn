'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useRouteLoading } from '@/components/route-loading-provider'
import { supabase } from '@/lib/supabase'
import { resolvePostLoginRedirect } from '@/lib/auth-redirect'
import { useLanguage } from '@/components/providers/language-provider'

export default function AuthCallbackPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { startLoading } = useRouteLoading()
    const { t } = useLanguage()
    const [message, setMessage] = useState('')

    useEffect(() => {
        setMessage(t('auth.callback.status.completing', 'Completing Google sign-in...'))
    }, [t])

    useEffect(() => {
        const completeGoogleSignIn = async () => {
            try {
                const params = new URLSearchParams(window.location.search)
                const providerError =
                    params.get('error_description') ?? params.get('error')

                if (providerError) {
                    throw new Error(providerError)
                }

                const {
                    data: { session: initialSession },
                    error: initialSessionError,
                } = await supabase.auth.getSession()

                if (initialSessionError) {
                    throw initialSessionError
                }

                let session = initialSession

                if (!session) {
                    const code = params.get('code')
                    if (!code) {
                        throw new Error('Missing OAuth code in callback URL.')
                    }

                    setMessage(t('auth.callback.status.securing', 'Securing your session...'))
                    const { error: exchangeError } =
                        await supabase.auth.exchangeCodeForSession(code)

                    if (exchangeError) {
                        throw exchangeError
                    }

                    const {
                        data: { session: exchangedSession },
                        error: exchangedSessionError,
                    } = await supabase.auth.getSession()

                    if (exchangedSessionError) {
                        throw exchangedSessionError
                    }

                    session = exchangedSession
                }

                if (!session?.user) {
                    throw new Error('No active user session after Google sign-in.')
                }

                setMessage(t('auth.callback.status.loadingProfile', 'Loading your profile...'))
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .maybeSingle()

                if (profileError) {
                    console.error('Failed to read user profile role:', profileError)
                }

                const redirectPath = resolvePostLoginRedirect(profile?.role ?? 'lawyer')
                startLoading()
                router.replace(redirectPath)
            } catch (error: any) {
                console.error('Google OAuth callback failed:', error)
                toast({
                    title: t('auth.callback.error.title', 'Google sign-in failed'),
                    description:
                        error?.message ?? t('auth.callback.error.description', 'Unable to complete sign in with Google.'),
                    variant: 'destructive',
                })
                router.replace('/login?oauthError=1')
            }
        }

        completeGoogleSignIn()
    }, [router, startLoading, t, toast])

    return (
        <div className="max-w-md mx-auto py-16 px-4">
            <Card>
                <CardContent className="py-10">
                    <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{message}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
