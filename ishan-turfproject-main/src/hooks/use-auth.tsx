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
  setRole: (role: 'admin' | 'staff') => Promise<void>
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

    // Helper: fetch the owner (admin) ID for staff accounts.
    // Strategy 1 → localStorage cache (fastest — owner must have logged in at
    //              least once on this device OR manually set).
    // Strategy 2 → query the `users` table for any user that is NOT the current
    //              employee. Since there are only 2 users (owner + employee) the
    //              first non-self result IS the owner.
    // Strategy 3 → fall back to cached value (may equal currentUserId in the
    //              rare edge case the owner has never existed in DB yet).
    const fetchSharedOwnerId = async (currentUserId: string, isStaff: boolean): Promise<string> => {
      if (!isStaff) {
        // Owner logs in → cache their real auth.uid() so employees can read it.
        localStorage.setItem('elite_primary_owner_id', currentUserId)
        return currentUserId
      }

      // ── Strategy 1: localStorage (instant, works after owner has ever logged in) ──
      const cached = localStorage.getItem('elite_primary_owner_id')
      if (cached && cached !== currentUserId) {
        // Good: a different user's ID is cached — that's the owner.
        return cached
      }

      // ── Strategy 2: DB lookup ─────────────────────────────────────────────────
      try {
        // Fetch all users except the current employee (at most 1 row for a 2-user system).
        const { data: otherUsers } = await supabase
          .from('users')
          .select('id, role, email')
          .neq('id', currentUserId)
          .limit(10)

        if (otherUsers && otherUsers.length > 0) {
          // Prefer explicit role=admin, then any non-staff email, then first result.
          const owner =
            otherUsers.find((u) => u.role === 'admin') ||
            otherUsers.find(
              (u) =>
                !u.email?.toLowerCase().includes('abc') &&
                !u.email?.toLowerCase().includes('staff')
            ) ||
            otherUsers[0]

          if (owner?.id) {
            localStorage.setItem('elite_primary_owner_id', owner.id)
            return owner.id
          }
        }
      } catch (err) {
        console.warn('fetchSharedOwnerId DB lookup failed:', err)
      }

      // ── Strategy 3: use whatever is cached, even if it equals currentUserId ──
      return cached || currentUserId
    }

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (mounted) {
          if (session?.user) {
            const userEmail = (session.user.email || '').toLowerCase()
            const isStaff = userEmail.includes('abc') || userEmail.includes('staff')
            const cachedOwnerId = localStorage.getItem('elite_primary_owner_id') || session.user.id

            setState({
              rawUser: session.user,
              profile: null,
              session,
              loading: false,
              error: null,
              sharedOwnerId: cachedOwnerId,
            })

            // Run user verification and shared owner ID lookup concurrently in background
            void (async () => {
              const profile = await ensureUserExists(session.user)
              const finalIsStaff = isStaff || profile?.role === 'staff'
              const ownerId = await fetchSharedOwnerId(session.user.id, finalIsStaff)
              if (mounted) {
                setState((prev) => ({
                  ...prev,
                  profile,
                  sharedOwnerId: ownerId,
                }))
              }
            })()
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

  // Development-only mock auth: if VITE_DEV_MOCK_AUTH is true, allow local mock sign-in
  const devMockAuth = import.meta.env.VITE_DEV_MOCK_AUTH === 'true'

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
    if (devMockAuth) {
      // create a faux user object for dev testing
      const fakeUser: any = {
        id: 'dev-user-id',
        email,
      }
      const fakeProfile: any = {
        id: 'dev-user-id',
        full_name: 'Dev User',
        email,
        role: email.includes('staff') ? 'staff' : 'admin',
      }
      localStorage.setItem('elite_primary_owner_id', fakeUser.id)
      setState((prev) => ({
        ...prev,
        rawUser: fakeUser,
        profile: fakeProfile,
        session: { user: fakeUser } as any,
        sharedOwnerId: fakeUser.id,
      }))
      return
    }

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
          // Owner: cache their ID for employee use
          localStorage.setItem('elite_primary_owner_id', data.user.id)
        } else {
          // Employee: find owner with the same multi-strategy lookup
          const cached = localStorage.getItem('elite_primary_owner_id')
          if (cached && cached !== data.user.id) {
            ownerId = cached
          } else {
            try {
              const { data: otherUsers } = await supabase
                .from('users')
                .select('id, role, email')
                .neq('id', data.user.id)
                .limit(10)

              if (otherUsers && otherUsers.length > 0) {
                const owner =
                  otherUsers.find((u) => u.role === 'admin') ||
                  otherUsers.find(
                    (u) =>
                      !u.email?.toLowerCase().includes('abc') &&
                      !u.email?.toLowerCase().includes('staff')
                  ) ||
                  otherUsers[0]

                if (owner?.id) {
                  ownerId = owner.id
                  localStorage.setItem('elite_primary_owner_id', owner.id)
                } else {
                  ownerId = cached || data.user.id
                }
              } else {
                ownerId = cached || data.user.id
              }
            } catch {
              ownerId = cached || data.user.id
            }
          }
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

  const setRole = async (newRole: 'admin' | 'staff') => {
    if (state.rawUser) {
      try {
        await updateProfile({ role: newRole })
      } catch (err) {
        console.warn('Could not update role:', err)
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        user: proxiedUser,
        role: computedRole,
        isStaff: isStaffAccount,
        isAdmin: !isStaffAccount,
        effectiveUserId,
        setRole,
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
