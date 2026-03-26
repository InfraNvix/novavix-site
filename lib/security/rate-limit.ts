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

type UpstashLimiter = {
  limit: (key: string) => Promise<{
    success: boolean
    limit: number
    remaining: number
    reset: number
  }>
}

const store = new Map<string, RateLimitState>()
const upstashLimiters = new Map<string, UpstashLimiter>()

const MAX_IN_MEMORY_KEYS = Number(process.env.NOVAVIX_RATE_LIMIT_MAX_KEYS ?? '10000')
const MAX_RATE_LIMIT_KEY_LENGTH = 256

function now(): number {
  return Date.now()
}

function normalizeOptions(options: RateLimitOptions): RateLimitOptions {
  const safeLimit = Number.isFinite(options.limit) && options.limit > 0 ? Math.floor(options.limit) : 1
  const safeWindowMs = Number.isFinite(options.windowMs) && options.windowMs > 0 ? Math.floor(options.windowMs) : 1000

  return {
    limit: safeLimit,
    windowMs: safeWindowMs,
  }
}

function normalizeKey(key: string): string {
  const raw = key.trim()
  if (raw.length <= MAX_RATE_LIMIT_KEY_LENGTH) {
    return raw
  }

  return raw.slice(0, MAX_RATE_LIMIT_KEY_LENGTH)
}

function cleanup(): void {
  const current = now()
  store.forEach((state, key) => {
    if (state.resetAt <= current) {
      store.delete(key)
    }
  })
}

function enforceStoreCapacity(): void {
  if (store.size <= MAX_IN_MEMORY_KEYS) {
    return
  }

  const overflow = store.size - MAX_IN_MEMORY_KEYS
  let removed = 0

  for (const key of store.keys()) {
    store.delete(key)
    removed += 1
    if (removed >= overflow) {
      break
    }
  }
}

async function getUpstashLimiter(options: RateLimitOptions): Promise<UpstashLimiter | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    return null
  }

  const cacheKey = `${options.limit}:${options.windowMs}`
  const existing = upstashLimiters.get(cacheKey)
  if (existing) {
    return existing
  }

  const { Redis } = await import('@upstash/redis')
  const { Ratelimit } = await import('@upstash/ratelimit')

  const redis = new Redis({ url, token })
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.limit, `${Math.max(Math.floor(options.windowMs / 1000), 1)} s`),
    analytics: false,
    prefix: `novavix:${cacheKey}`,
  })

  upstashLimiters.set(cacheKey, limiter)
  return limiter
}

function checkRateLimitInMemory(key: string, options: RateLimitOptions): RateLimitResult {
  cleanup()
  enforceStoreCapacity()

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

export async function checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const safeOptions = normalizeOptions(options)
  const safeKey = normalizeKey(key)

  try {
    const limiter = await getUpstashLimiter(safeOptions)
    if (limiter) {
      const result = await limiter.limit(safeKey)
      const retryAfterSec = Math.max(Math.ceil((result.reset - now()) / 1000), 1)
      return {
        allowed: result.success,
        limit: result.limit,
        remaining: Math.max(result.remaining, 0),
        retryAfterSec,
      }
    }
  } catch {
    // Fallback to in-memory limiter when Redis is unavailable.
  }

  return checkRateLimitInMemory(safeKey, safeOptions)
}
