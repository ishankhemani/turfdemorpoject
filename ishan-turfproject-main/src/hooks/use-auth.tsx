import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'
import type { User } from '@/types/database'
import { ensureUserExists } from '@/lib/ensure-user-exists'

interface AuthState {
  rawUser: SupabaseUser | null
  profile: User | null
  session: Session | null
  loading: boolean
  error: string | null
  sharedOwnerId: string | null
}

interface AuthContextType {
  user: (SupabaseUser & { rawId?: string }) | null
  rawUser: SupabaseUser | null
  profile: User | null
  session: Session | null
  loading: boolean
  error: string | null
  role: 'admin' | 'staff'
  isStaff: boolean
  isAdmin: boolean
  effectiveUserId: string | null
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    rawUser: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
    sharedOwnerId: localStorage.getItem('elite_primary_owner_id') || null,
  })

  useEffect(() => {
    let mounted = true

    const fetchSharedOwnerId = async (currentUserId: string, isStaff: boolean): Promise<string> => {
      if (!isStaff) {
        localStorage.setItem('elite_primary_owner_id', currentUserId)
        return currentUserId
      }

      // If staff is logged in, search for owner ID in database
      try {
        const { data: owner } = await supabase
          .from('users')
          .select('id')
          .or('email.ilike.%kulprakash%,role.eq.admin')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (owner?.id) {
          localStorage.setItem('elite_primary_owner_id', owner.id)
          return owner.id
        }
      } catch (err) {
        console.warn('Failed to fetch shared owner ID:', err)
      }

      const cached = localStorage.getItem('elite_primary_owner_id')
      return cached || currentUserId
    }

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (mounted) {
          if (session?.user) {
            const profile = await ensureUserExists(session.user)
            const userEmail = (session.user.email || profile?.email || '').toLowerCase()
            const isStaff = userEmail.includes('abc') || userEmail.includes('staff') || profile?.role === 'staff'
            const ownerId = await fetchSharedOwnerId(session.user.id, isStaff)

            setState({
              rawUser: session.user,
              profile,
              session,
              loading: false,
              error: null,
              sharedOwnerId: ownerId,
            })
          } else {
            setState({
              rawUser: null,
              profile: null,
              session: null,
              loading: false,
              error: null,
              sharedOwnerId: localStorage.getItem('elite_primary_owner_id') || null,
            })
          }
        }
      } catch (error) {
        if (mounted) {
          setState({
            rawUser: null,
            profile: null,
            session: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Authentication error',
            sharedOwnerId: null,
          })
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (session?.user) {
          const profile = await ensureUserExists(session.user)
          const userEmail = (session.user.email || profile?.email || '').toLowerCase()
          const isStaff = userEmail.includes('abc') || userEmail.includes('staff') || profile?.role === 'staff'
          const ownerId = await fetchSharedOwnerId(session.user.id, isStaff)

          setState({
            rawUser: session.user,
            profile,
            session,
            loading: false,
            error: null,
            sharedOwnerId: ownerId,
          })
        } else {
          setState({
            rawUser: null,
            profile: null,
            session: null,
            loading: false,
            error: null,
            sharedOwnerId: localStorage.getItem('elite_primary_owner_id') || null,
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
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })
      if (error) throw error

      if (data.user) {
        const profile = await ensureUserExists(data.user, email, fullName)
        setState((prev) => ({
          ...prev,
          rawUser: data.user,
          profile,
          session: data.session,
        }))
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Sign up failed',
      }))
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      if (data.user) {
        const profile = await ensureUserExists(data.user)
        const userEmail = (data.user.email || profile?.email || '').toLowerCase()
        const isStaff = userEmail.includes('abc') || userEmail.includes('staff') || profile?.role === 'staff'
        let ownerId = data.user.id

        if (!isStaff) {
          localStorage.setItem('elite_primary_owner_id', data.user.id)
        } else {
          const cached = localStorage.getItem('elite_primary_owner_id')
          ownerId = cached || data.user.id
        }

        setState((prev) => ({
          ...prev,
          rawUser: data.user,
          profile,
          session: data.session,
          sharedOwnerId: ownerId,
        }))
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Sign in failed',
      }))
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setState((prev) => ({
        ...prev,
        rawUser: null,
        profile: null,
        session: null,
      }))
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
    if (!state.rawUser) return

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', state.rawUser.id)

      if (error) throw error

      setState((prev) => ({
        ...prev,
        profile: prev.profile ? ({ ...prev.profile, ...updates } as User) : null,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Profile update failed',
      }))
      throw error
    }
  }

  // Determine user role
  const userEmail = (state.rawUser?.email || state.profile?.email || '').toLowerCase()
  const isStaffAccount = userEmail.includes('abc') || userEmail.includes('staff') || state.profile?.role === 'staff'
  const computedRole: 'admin' | 'staff' = isStaffAccount ? 'staff' : 'admin'

  const effectiveUserId = state.sharedOwnerId || state.rawUser?.id || ''

  // Proxy user object so user.id points to the shared tenant/owner user_id for all DB queries
  const proxiedUser = state.rawUser
    ? {
        ...state.rawUser,
        id: effectiveUserId,
        rawId: state.rawUser.id,
      }
    : null

  return (
    <AuthContext.Provider
      value={{
        ...state,
        user: proxiedUser,
        role: computedRole,
        isStaff: isStaffAccount,
        isAdmin: !isStaffAccount,
        effectiveUserId,
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
