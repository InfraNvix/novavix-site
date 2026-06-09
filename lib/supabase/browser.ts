import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { purgeSensitiveBrowserStorage } from '@/lib/security/browser-storage'

let browserClient: SupabaseClient | null = null

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) {
    purgeSensitiveBrowserStorage()
    return browserClient
  }

  if (!supabaseUrl) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  purgeSensitiveBrowserStorage()
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  purgeSensitiveBrowserStorage()

  return browserClient
}
