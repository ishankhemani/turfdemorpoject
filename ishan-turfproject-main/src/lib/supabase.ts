import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // PKCE (Proof Key for Code Exchange) — prevents CSRF attacks on OAuth flows
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Store session in localStorage (default); for higher security use 'cookie' on SSR
    storage: window.localStorage,
  },
  global: {
    headers: {
      // Identify the client for observability / Supabase logs
      'X-Client-Info': 'elite-arena-pwa/1.0',
    },
  },
  db: {
    // Prefer schema-qualified queries (defence-in-depth)
    schema: 'public',
  },
  realtime: {
    params: {
      // Limit realtime heartbeat to reduce abuse surface
      eventsPerSecond: 10,
    },
  },
})

export type SupabaseClient = typeof supabase
