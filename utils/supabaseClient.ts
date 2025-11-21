import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const supabase: SupabaseClient = (() => {
  const g = globalThis as any
  if (g.__supabase_client) return g.__supabase_client as SupabaseClient
  const c = createClient(url, key, { auth: { storageKey: 'ud-auth', autoRefreshToken: true, persistSession: true } })
  g.__supabase_client = c
  return c
})()

export { supabase }