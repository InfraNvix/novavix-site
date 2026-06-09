const SENSITIVE_STORAGE_KEY_PATTERNS = [
  /^sb-[a-z0-9]+-auth-token$/i,
  /^supabase\.auth\.token$/i,
  /supabase.*auth/i,
  /(^|[-_.])access[-_]?token($|[-_.])/i,
  /(^|[-_.])refresh[-_]?token($|[-_.])/i,
  /(^|[-_.])auth[-_]?token($|[-_.])/i,
  /(^|[-_.])session[-_]?token($|[-_.])/i,
  /(^|[-_.])jwt($|[-_.])/i,
  /novavix.*token/i,
]

const SENSITIVE_STORAGE_VALUE_PATTERNS = [
  /"access_token"\s*:/i,
  /"refresh_token"\s*:/i,
  /"provider_token"\s*:/i,
  /"provider_refresh_token"\s*:/i,
  /\bBearer\s+[A-Za-z0-9._-]+/i,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
]

function getBrowserStorage(name: 'localStorage' | 'sessionStorage'): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window[name]
  } catch {
    return null
  }
}

function isBrowserStorageAvailable(storage: Storage | null): storage is Storage {
  return Boolean(storage)
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_STORAGE_KEY_PATTERNS.some((pattern) => pattern.test(key))
}

function isSensitiveValue(value: string | null): boolean {
  if (!value) return false
  return SENSITIVE_STORAGE_VALUE_PATTERNS.some((pattern) => pattern.test(value))
}

function purgeStorage(storage: Storage | null): void {
  if (!isBrowserStorageAvailable(storage)) return

  const keysToRemove: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key) continue

    let value: string | null = null
    try {
      value = storage.getItem(key)
    } catch {
      value = null
    }

    if (isSensitiveKey(key) || isSensitiveValue(value)) {
      keysToRemove.push(key)
    }
  }

  for (const key of keysToRemove) {
    try {
      storage.removeItem(key)
    } catch {
      // Browser storage can be blocked by privacy settings.
    }
  }
}

export function purgeSensitiveBrowserStorage(): void {
  if (typeof window === 'undefined') return
  purgeStorage(getBrowserStorage('localStorage'))
  purgeStorage(getBrowserStorage('sessionStorage'))
}
