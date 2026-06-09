const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const REDACTED = '[REDACTED]'

const SENSITIVE_PATTERNS: RegExp[] = [
  /mongodb(?:\+srv)?:\/\/[^\s'"]+/gi,
  /https?:\/\/[^\s'"]*upstash[^\s'"]*/gi,
  /(SUPABASE_SERVICE_ROLE_KEY|MONGODB_URI|RESEND_API_KEY|UPSTASH_REDIS_REST_TOKEN|NOVAVIX_[A-Z0-9_]+)\s*[:=]\s*[^\s,;]+/gi,
  /(\/portal\/)([a-z0-9_-]{16,})/gi,
  /(token|invite)=([a-z0-9_-]{16,})/gi,
  /(Bearer\s+)[A-Za-z0-9._-]+/gi,
]

export function redactSensitiveText(input: string): string {
  let output = input
  for (const pattern of SENSITIVE_PATTERNS) {
    output = output.replace(pattern, (...args: unknown[]) => {
      const maybePrefix = args[1]
      if (typeof maybePrefix === 'string' && maybePrefix.length > 0) {
        const normalized = maybePrefix.trim().toLowerCase()
        if (normalized === 'bearer') {
          return `${maybePrefix} ${REDACTED}`
        }
        if (normalized === '/portal/') {
          return `${maybePrefix}${REDACTED}`
        }
        return `${maybePrefix}=${REDACTED}`
      }
      return REDACTED
    })
  }
  return output
}

export function sanitizeErrorMessage(error: unknown, fallback = 'INTERNAL_ERROR'): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : fallback
  const normalized = raw.trim().length > 0 ? raw.trim() : fallback
  return redactSensitiveText(normalized).slice(0, 400)
}

export function getPublicErrorDetails(error: unknown): string[] {
  if (IS_PRODUCTION) {
    return []
  }
  return [sanitizeErrorMessage(error)]
}

export function getPublicDebugDetails(code: string): string[] {
  if (IS_PRODUCTION) {
    return []
  }
  return [redactSensitiveText(code).slice(0, 200)]
}

export function logServerError(context: string, error: unknown, meta?: Record<string, unknown>): void {
  const payload: Record<string, unknown> = {
    message: sanitizeErrorMessage(error),
    ...(meta ?? {}),
  }

  if (!IS_PRODUCTION && error instanceof Error && error.stack) {
    payload.stack = redactSensitiveText(error.stack).slice(0, 2000)
  }

  console.error(context, payload)
}
