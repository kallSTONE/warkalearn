'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type UserRole = 'lawyer' | 'mentor' | 'admin' | 'reviewer'

type SupabaseUser = {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
    role?: UserRole
    referral_code?: string
  }
}

type SupabaseContextType = {
  supabase: typeof supabase
  user: SupabaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithPhone: (phone: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: object) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

/* -------------------------------------------------------------------------- */
/* Context                                                                     */
/* -------------------------------------------------------------------------- */

const SupabaseContext = createContext<SupabaseContextType>({
  supabase,
  user: null,
  loading: true,
  signIn: async () => { },
  signInWithPhone: async () => { },
  signUp: async () => { },
  signInWithGoogle: async () => { },
  signOut: async () => { },
})

export const useSupabase = () => useContext(SupabaseContext)

/* -------------------------------------------------------------------------- */
/* Provider                                                                    */
/* -------------------------------------------------------------------------- */

export function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const claimPendingReferral = async (session: Session) => {
    const metadataCode =
      typeof session.user.user_metadata?.referral_code === 'string'
        ? session.user.user_metadata.referral_code.trim().toUpperCase()
        : null

    const localStorageCode =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('pendingReferralCode')?.trim().toUpperCase() ?? null
        : null

    const referralCode = metadataCode ?? localStorageCode

    if (!referralCode) {
      return
    }

    try {
      const response = await fetch('/api/referrals/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ referralCode }),
      })

      const payload = await response.json().catch(() => ({}))
      const claimStatus =
        typeof payload?.status === 'string' ? payload.status : null

      if (!response.ok) {
        // These statuses are terminal and should not be retried on every login.
        if (
          typeof window !== 'undefined' &&
          (claimStatus === 'already_claimed' ||
            claimStatus === 'invalid_code' ||
            claimStatus === 'self_referral')
        ) {
          window.localStorage.removeItem('pendingReferralCode')
        }

        throw new Error(String(payload?.error ?? 'Unable to claim referral.'))
      }

      if (claimStatus !== 'claimed') {
        throw new Error(`Unexpected referral claim status: ${claimStatus ?? 'unknown'}`)
      }

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('pendingReferralCode')
      }
    } catch (error: any) {
      console.error('Referral claim failed:', error)
    }
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, avatar_url, full_name')
            .eq('id', session.user.id)
            .single()

          if (error) {
            console.error('Failed to load profile:', error)
          }

          setUser({
            id: session.user.id,
            email: session.user.email ?? undefined,
            user_metadata: {
              full_name:
                profile?.full_name ??
                session.user.user_metadata?.full_name,
              avatar_url:
                profile?.avatar_url ??
                session.user.user_metadata?.avatar_url,
              role: (profile?.role as UserRole) ?? 'lawyer',
              referral_code: session.user.user_metadata?.referral_code,
            },
          })

          void claimPendingReferral(session)
        } else {
          setUser(null)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  /* ------------------------------------------------------------------------ */
  /* Auth Helpers                                                             */
  /* ------------------------------------------------------------------------ */

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      })
    } catch (error: any) {
      toast({
        title: 'Authentication error',
        description: error.message ?? 'Failed to sign in.',
        variant: 'destructive',
      })
    }
  }

  const signUp = async (
    email: string,
    password: string,
    metadata: object = {}
  ) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      })
      if (error) throw error

      toast({
        title: 'Account created',
        description: 'Please check your email to confirm your account.',
      })
    } catch (error: any) {
      toast({
        title: 'Registration error',
        description: error.message ?? 'Failed to create account.',
        variant: 'destructive',
      })
    }
  }

  const signInWithPhone = async (phone: string, password: string) => {
    try {
      const { error: phoneSignInError } = await supabase.auth.signInWithPassword({
        phone,
        password,
      })

      if (phoneSignInError) {
        const isPhoneLoginDisabled = (phoneSignInError.message ?? '')
          .toLowerCase()
          .includes('phone logins are disabled')

        if (!isPhoneLoginDisabled) {
          throw phoneSignInError
        }

        const prepareResponse = await fetch('/api/auth/phone/prepare-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        })

        const preparePayload =
          ((await prepareResponse.json().catch(() => ({}))) as {
            loginEmail?: string
            error?: string
          }) ?? {}

        if (!prepareResponse.ok || typeof preparePayload.loginEmail !== 'string') {
          throw new Error(preparePayload.error ?? 'Failed to prepare phone login.')
        }

        const { error: emailSignInError } = await supabase.auth.signInWithPassword({
          email: preparePayload.loginEmail,
          password,
        })

        if (emailSignInError) {
          throw emailSignInError
        }
      }

      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      })
    } catch (error: any) {
      toast({
        title: 'Authentication error',
        description: error.message ?? 'Failed to sign in with phone.',
        variant: 'destructive',
      })
      throw error
    }
  }

  const signInWithGoogle = async () => {
    try {
      if (typeof window === 'undefined') {
        return
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (error) throw error
    } catch (error: any) {
      toast({
        title: 'Google sign-in error',
        description:
          error.message ?? 'Failed to continue with Google.',
        variant: 'destructive',
      })
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)

      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to sign out.',
        variant: 'destructive',
      })
    }
  }

  /* ------------------------------------------------------------------------ */

  return (
    <SupabaseContext.Provider
      value={{
        supabase,
        user,
        loading,
        signIn,
        signInWithPhone,
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  )
}
