import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '@/types/database'

export async function ensureUserExists(
  userIdOrUser: string | SupabaseUser,
  email?: string,
  fullName?: string
): Promise<User | null> {
  const userId = typeof userIdOrUser === 'string' ? userIdOrUser : userIdOrUser.id
  if (!userId) return null

  const userEmail = (
    email ||
    (typeof userIdOrUser !== 'string' ? userIdOrUser.email : undefined) ||
    'owner@example.com'
  ).toLowerCase().trim()

  const userFullName =
    fullName ||
    (typeof userIdOrUser !== 'string' ? userIdOrUser.user_metadata?.full_name : undefined) ||
    userEmail.split('@')[0] ||
    'User'

  // Determine role: staff accounts (abc123@gmail.com, abc@gmail.com, or email containing 'staff')
  const isStaffAccount = userEmail.includes('abc') || userEmail.includes('staff')
  const userRole = isStaffAccount ? 'staff' : 'admin'

  try {
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (profile) {
      if (!profile.role || profile.role !== userRole) {
        await supabase.from('users').update({ role: userRole }).eq('id', userId)
        profile.role = userRole
      }
      return profile as User
    }

    const newProfile = {
      id: userId,
      email: userEmail,
      full_name: userFullName,
      role: userRole,
    }

    const { data: upserted, error } = await supabase
      .from('users')
      .upsert(newProfile, { onConflict: 'id' })
      .select()
      .maybeSingle()

    if (error) {
      console.warn('ensureUserExists upsert warning:', error.message)
    }

    return (upserted as User) || (newProfile as User)
  } catch (err) {
    console.warn('ensureUserExists error:', err)
    return null
  }
}
