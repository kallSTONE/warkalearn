'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, getSession } from 'next-auth/react'

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

const SupabaseContext = createContext<SupabaseContextType>({
  supabase,
  user: null,
  loading: true,
  signIn: async () => {},
  signInWithPhone: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
})

export const useSupabase = () => useContext(SupabaseContext)

export function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const refreshUser = useCallback(async () => {
    try {
      const session = await getSession()
      if (session?.user?.id) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
          user_metadata: {
            full_name: (session.user as any).fullName ?? session.user.name ?? '',
            avatar_url: (session.user as any).avatarUrl ?? session.user.image ?? '',
            role: ((session.user as any).role as UserRole) ?? 'lawyer',
          },
        })
      } else {
        setUser(null)
      }
    } catch (err) {
      console.error('Failed to load session:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const signIn = async (email: string, password: string) => {
    try {
      const res = await nextAuthSignIn('credentials', {
        identifier: email,
        password,
        redirect: false,
      })

      if (res?.error) {
        throw new Error('Invalid email/phone or password.')
      }

      await refreshUser()

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
      throw error
    }
  }

  const signUp = async (
    email: string,
    password: string,
    metadata: any = {}
  ) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: email,
          password,
          fullName: metadata?.full_name,
          referralCode: metadata?.referral_code,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account.')
      }

      // Automatically sign in with credentials
      const signInRes = await nextAuthSignIn('credentials', {
        identifier: email,
        password,
        redirect: false,
      })

      if (signInRes?.error) {
        throw new Error('Account created, but automatic sign in failed. Please log in.')
      }

      await refreshUser()

      toast({
        title: 'Account created',
        description: 'Welcome to Warka Learn!',
      })
    } catch (error: any) {
      toast({
        title: 'Registration error',
        description: error.message ?? 'Failed to create account.',
        variant: 'destructive',
      })
      throw error
    }
  }

  const signInWithPhone = async (phone: string, password: string) => {
    try {
      const res = await nextAuthSignIn('credentials', {
        identifier: phone,
        password,
        redirect: false,
      })

      if (res?.error) {
        throw new Error('Invalid phone number or password.')
      }

      await refreshUser()

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
      await nextAuthSignIn('google', { redirect: true })
    } catch (error: any) {
      toast({
        title: 'Google sign-in error',
        description: error.message ?? 'Failed to continue with Google.',
        variant: 'destructive',
      })
    }
  }

  const signOut = async () => {
    try {
      await nextAuthSignOut({ redirect: false })
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
