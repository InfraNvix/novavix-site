import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { normalizeCnpj, isValidCnpjFormat } from '@/lib/auth/cnpj'
import { isUserRole, type UserRole } from '@/lib/auth/roles'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { recordAuthAuditEvent } from '@/lib/auth/audit'

export const dynamic = 'force-dynamic'

type LoginMode = 'empresa' | 'admin' | 'clinica'
type ApiErrorCode = 'INVALID_JSON' | 'VALIDATION_ERROR' | 'AUTH_FAILED' | 'TOO_MANY_REQUESTS' | 'INTERNAL_ERROR'
type PendingCookie = { name: string; value: string; options: CookieOptions }

function getPublicEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function isLoginMode(value: unknown): value is LoginMode {
  return value === 'empresa' || value === 'admin' || value === 'clinica'
}

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function errorResponse(status: number, code: ApiErrorCode, message: string, details?: string[], headers?: Record<string, string>): NextResponse {
  const response = NextResponse.json({ ok: false, error: { code, message, details: details ?? [] } }, { status })
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value)
    }
  }
  return response
}

function createRouteSupabaseClient(request: NextRequest): { supabase: SupabaseClient; pendingCookies: PendingCookie[] } {
  const pendingCookies: PendingCookie[] = []
  const supabase = createServerClient(getPublicEnv('NEXT_PUBLIC_SUPABASE_URL'), getPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        pendingCookies.push({ name, value, options })
      },
      remove(name: string, options: CookieOptions) {
        pendingCookies.push({ name, value: '', options: { ...options, maxAge: 0 } })
      },
    },
  })

  return { supabase, pendingCookies }
}

function attachCookies(response: NextResponse, pendingCookies: PendingCookie[]): NextResponse {
  for (const cookie of pendingCookies) {
    response.cookies.set({ name: cookie.name, value: cookie.value, ...cookie.options })
  }
  response.headers.set('Cache-Control', 'no-store')
  return response
}

async function getCompanyLoginEmail(cnpj: string): Promise<string | null> {
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin
    .from('user_profiles')
    .select('login_email, companies!inner(cnpj, status)')
    .eq('role', 'empresa')
    .eq('is_active', true)
    .eq('companies.cnpj', cnpj)
    .eq('companies.status', 'active')
    .maybeSingle()

  if (error || !data?.login_email) {
    return null
  }

  return data.login_email
}

async function getActiveProfile(userId: string): Promise<{ role: UserRole; loginEmail: string } | null> {
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin
    .from('user_profiles')
    .select('role, login_email, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data || !isUserRole(data.role)) {
    return null
  }

  return {
    role: data.role,
    loginEmail: data.login_email,
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent')
  let mode: LoginMode = 'empresa'
  let identifier = 'unknown'

  try {
    const contentLength = Number(request.headers.get('content-length') ?? '0')
    if (Number.isFinite(contentLength) && contentLength > 8_000) {
      return errorResponse(413, 'VALIDATION_ERROR', 'Payload muito grande.')
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Body precisa ser JSON valido.')
    }

    if (!body || typeof body !== 'object') {
      return errorResponse(422, 'VALIDATION_ERROR', 'Dados de login invalidos.')
    }

    const payload = body as Record<string, unknown>
    if (!isLoginMode(payload.mode)) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Modo de login invalido.')
    }

    mode = payload.mode
    const password = asTrimmed(payload.password)
    if (!password) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Informe sua senha.')
    }

    let email = ''
    if (mode === 'empresa') {
      const cnpj = normalizeCnpj(asTrimmed(payload.cnpj))
      identifier = cnpj || 'unknown'
      if (!isValidCnpjFormat(cnpj)) {
        return errorResponse(422, 'VALIDATION_ERROR', 'Informe um CNPJ valido com 14 digitos.')
      }
      email = (await getCompanyLoginEmail(cnpj)) ?? ''
    } else {
      email = asTrimmed(payload.email).toLowerCase()
      identifier = email || 'unknown'
      if (!email.includes('@')) {
        return errorResponse(422, 'VALIDATION_ERROR', 'Informe um e-mail valido.')
      }
    }

    const ipLimit = await checkRateLimit(`auth-login-ip:${ip}`, { limit: 20, windowMs: 60_000 })
    const identifierLimit = await checkRateLimit(`auth-login-identifier:${mode}:${identifier}`, { limit: 8, windowMs: 5 * 60_000 })
    const limit = !ipLimit.allowed ? ipLimit : identifierLimit
    if (!ipLimit.allowed || !identifierLimit.allowed) {
      return errorResponse(429, 'TOO_MANY_REQUESTS', 'Muitas tentativas. Tente novamente em instantes.', [], {
        'Retry-After': String(limit.retryAfterSec),
        'X-RateLimit-Limit': String(limit.limit),
        'X-RateLimit-Remaining': String(limit.remaining),
      })
    }

    if (!email) {
      await recordAuthAuditEvent({ event: 'login', status: 'failure', mode, identifier, ip, userAgent, reason: 'identity_not_found' })
      return errorResponse(401, 'AUTH_FAILED', 'Credenciais invalidas.')
    }

    const { supabase, pendingCookies } = createRouteSupabaseClient(request)
    const {
      data: { user },
      error: signInError,
    } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError || !user) {
      await recordAuthAuditEvent({ event: 'login', status: 'failure', mode, identifier, ip, userAgent, reason: 'auth_failed' })
      return attachCookies(errorResponse(401, 'AUTH_FAILED', 'Credenciais invalidas.'), pendingCookies)
    }

    const profile = await getActiveProfile(user.id)
    if (!profile || (mode !== 'admin' && profile.role !== mode) || (mode === 'admin' && profile.role !== 'admin')) {
      await supabase.auth.signOut()
      await recordAuthAuditEvent({ event: 'login', status: 'failure', mode, identifier, ip, userAgent, reason: 'role_mismatch' })
      return attachCookies(errorResponse(401, 'AUTH_FAILED', 'Credenciais invalidas.'), pendingCookies)
    }

    await recordAuthAuditEvent({ event: 'login', status: 'success', mode, identifier, ip, userAgent })
    return attachCookies(
      NextResponse.json({
        ok: true,
        data: {
          role: profile.role,
          email: profile.loginEmail,
          redirectTo: profile.role === 'clinica' ? '/clinic' : '/dashboard',
        },
      }),
      pendingCookies
    )
  } catch (error) {
    await recordAuthAuditEvent({
      event: 'login',
      status: 'failure',
      mode,
      identifier,
      ip,
      userAgent,
      reason: error instanceof Error ? error.message : 'internal_error',
    })
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao processar login.')
  }
}
