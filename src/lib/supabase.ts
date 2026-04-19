import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Server-side client with service role key (full access)
// Lazy-initialized to avoid crashing at module load if env vars are missing
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel dashboard → Settings → Environment Variables.'
      )
    }
    _supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _supabase
}

// Convenience alias (lazy getter)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop]
  },
})

// Client-side anon client (limited by RLS)
let _supabaseAnon: SupabaseClient | null = null

export function getSupabaseAnon(): SupabaseClient {
  if (!_supabaseAnon) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel dashboard → Settings → Environment Variables.'
      )
    }
    _supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _supabaseAnon
}

export const supabaseAnon = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAnon() as any)[prop]
  },
})
