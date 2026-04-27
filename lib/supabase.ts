import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// For client-side / read operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side API routes — bypasses RLS
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey ?? supabaseAnonKey
)

export type Lead = {
  id: string
  name: string
  phone: string
  message: string | null
  utm_source: string | null
  utm_campaign: string | null
  created_at: string
}
