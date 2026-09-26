'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'  // Adjust if needed

type SupabaseUser = {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
    role?: 'student' | 'mentor' | 'admin'
  }
}

type SupabaseContextType = {
  supabase: typeof supabase | null
  user: SupabaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: object) => Promise<void>
  signOut: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType>({
  supabase: null,
  user: null,
  loading: true,
  signIn: async () => { },
  signUp: async () => { },
  signOut: async () => { },
})

export const useSupabase = () => useContext(SupabaseContext)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const normalizeRole = (role: unknown): 'student' | 'mentor' | 'admin' => {
    return role === 'mentor' || role === 'admin' || role === 'student' ? role : 'student'
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {


          const { data: userData, error } = await supabase
            .from('profiles')
            .select('role, avatar_url, full_name')
            .eq('id', session.user.id)
            .single()

          setUser({
            id: session.user.id,
            email: session.user.email ?? undefined,
            user_metadata: {
              full_name: userData?.full_name ?? session.user.user_metadata?.full_name,
              avatar_url: userData?.avatar_url ?? session.user.user_metadata?.avatar_url,
              role: normalizeRole(userData?.role ?? session.user.user_metadata?.role),
            },
          })
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

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
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

  const signUp = async (email: string, password: string, metadata = {}) => {
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

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      })
      setUser(null)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to sign out.',
        variant: 'destructive',
      })
    }
  }

  const value = {
    supabase,
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}