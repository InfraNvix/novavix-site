import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  // Legacy compatibility module. Prefer lib/supabase/browser.ts or server/admin variants.
  // This warning stays to avoid silent runtime issues in old imports.
  // eslint-disable-next-line no-console
  console.warn('Atenção: variáveis de ambiente do Supabase não foram encontradas.')
}

/**
 * @deprecated Use segregated clients in lib/supabase/*.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

