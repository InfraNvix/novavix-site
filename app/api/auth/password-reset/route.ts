import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { normalizeCnpj, isValidCnpjFormat } from '@/lib/auth/cnpj'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { recordAuthAuditEvent } from '@/lib/auth/audit'

export const dynamic = 'force-dynamic'

type ResetMode = 'empresa' | 'admin' | 'clinica'

function getPublicEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '')
}

function isResetMode(value: unknown): value is ResetMode {
  return value === 'empresa' || value === 'admin' || value === 'clinica'
}

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function successResponse(): NextResponse {
  const response = NextResponse.json({
    ok: true,
    data: {
      message: 'Se os dados estiverem cadastrados, enviaremos um link de redefinicao de senha.',
    },
  })
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent')
  let mode: ResetMode = 'empresa'
  let identifier = 'unknown'

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return successResponse()
    }

    if (!body || typeof body !== 'object') {
      return successResponse()
    }

    const payload = body as Record<string, unknown>
    if (!isResetMode(payload.mode)) {
      return successResponse()
    }

    mode = payload.mode
    let email = ''

    if (mode === 'empresa') {
      const cnpj = normalizeCnpj(asTrimmed(payload.cnpj))
      identifier = cnpj || 'unknown'
      if (isValidCnpjFormat(cnpj)) {
        email = (await getCompanyLoginEmail(cnpj)) ?? ''
      }
    } else {
      email = asTrimmed(payload.email).toLowerCase()
      identifier = email || 'unknown'
    }

    const ipLimit = await checkRateLimit(`password-reset-ip:${ip}`, { limit: 5, windowMs: 60 * 60_000 })
    const identifierLimit = await checkRateLimit(`password-reset-identifier:${mode}:${identifier}`, { limit: 3, windowMs: 60 * 60_000 })
    if (!ipLimit.allowed || !identifierLimit.allowed) {
      await recordAuthAuditEvent({ event: 'password_reset_request', status: 'failure', mode, identifier, ip, userAgent, reason: 'rate_limited' })
      return successResponse()
    }

    if (email.includes('@')) {
      const supabase = createClient(getPublicEnv('NEXT_PUBLIC_SUPABASE_URL'), getPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      const redirectTo = `${getAppUrl() || new URL(request.url).origin}/auth/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      await recordAuthAuditEvent({
        event: 'password_reset_request',
        status: error ? 'failure' : 'success',
        mode,
        identifier,
        ip,
        userAgent,
        reason: error?.message,
      })
    } else {
      await recordAuthAuditEvent({ event: 'password_reset_request', status: 'failure', mode, identifier, ip, userAgent, reason: 'identity_not_found' })
    }

    return successResponse()
  } catch (error) {
    await recordAuthAuditEvent({
      event: 'password_reset_request',
      status: 'failure',
      mode,
      identifier,
      ip,
      userAgent,
      reason: error instanceof Error ? error.message : 'internal_error',
    })
    return successResponse()
  }
}
