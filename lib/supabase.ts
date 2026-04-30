import { createClient } from '@supabase/supabase-js'

// Created inside function so env vars are read at runtime, not at build time
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export type Lead = {
  id: string
  name: string
  phone: string
  message: string | null
  utm_source: string | null
  utm_campaign: string | null
  device: string | null
  created_at: string
}

export type Event = {
  id: string
  type: string
  device: string | null
  utm_source: string | null
  created_at: string
}
