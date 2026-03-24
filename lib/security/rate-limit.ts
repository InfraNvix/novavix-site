type RateLimitOptions = {
  limit: number
  windowMs: number
}

type RateLimitState = {
  count: number
  resetAt: number
}

type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSec: number
}

const store = new Map<string, RateLimitState>()

function now(): number {
  return Date.now()
}

function cleanup(): void {
  const current = now()
  for (const [key, state] of store.entries()) {
    if (state.resetAt <= current) {
      store.delete(key)
    }
  }
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  cleanup()

  const current = now()
  const existing = store.get(key)

  if (!existing || existing.resetAt <= current) {
    const resetAt = current + options.windowMs
    store.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      limit: options.limit,
      remaining: Math.max(options.limit - 1, 0),
      retryAfterSec: Math.ceil(options.windowMs / 1000),
    }
  }

  existing.count += 1
  store.set(key, existing)

  const allowed = existing.count <= options.limit
  const remaining = Math.max(options.limit - existing.count, 0)
  const retryAfterSec = Math.max(Math.ceil((existing.resetAt - current) / 1000), 1)

  return {
    allowed,
    limit: options.limit,
    remaining,
    retryAfterSec,
  }
}

