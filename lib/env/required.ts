const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'NEXT_PUBLIC_APP_URL',
  'FRONTEND_URL',
  'NOVAVIX_SYNC_API_KEY',
  'NOVAVIX_COPSOQ_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
] as const

let hasValidatedEnv = false

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function validateRequiredEnv(): void {
  if (!isProduction() || hasValidatedEnv) {
    return
  }

  const missing: string[] = REQUIRED_ENV_VARS.filter((name) => {
    const value = process.env[name]
    return !value || value.trim().length === 0
  })

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`)
  }

  hasValidatedEnv = true
}
