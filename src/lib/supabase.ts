import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null

export function requireSupabase() {
  if (!supabase) throw new Error('Online ordering is not configured yet. Please contact the cafe directly.')
  return supabase
}
