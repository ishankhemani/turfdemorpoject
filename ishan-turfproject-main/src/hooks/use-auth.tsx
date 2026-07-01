import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'
import type { User } from '@/types/database'

interface AuthState {
  user: SupabaseUser | null
  profile: User | null
  session: Session | null
  loading: boolean
  error: string | null
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (mounted) {
          if (session?.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            setState({
              user: session.user,
              profile,
              session,
              loading: false,
              error: null,
            })
          } else {
            setState({
              user: null,
              profile: null,
              session: null,
              loading: false,
              error: null,
            })
          }
        }
      } catch (error) {
        if (mounted) {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Authentication error',
          })
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setState({
            user: session.user,
            profile,
            session,
            loading: false,
            error: null,
          })
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            error: null,
          })
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign up failed',
      }))
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      }))
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        error: null,
      })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Sign out failed',
      }))
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Password reset failed',
      }))
      throw error
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!state.user) return

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', state.user.id)

      if (error) throw error

      setState((prev) => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, ...updates } as User | null : null,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Profile update failed',
      }))
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
