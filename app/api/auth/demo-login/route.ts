import { NextResponse } from 'next/server'
import {
  DEMO_ADMIN_AUTH,
  DEMO_CLINIC_AUTH,
  DEMO_COMPANY_AUTH,
  DEMO_MODE_ENABLED,
  getDemoCookieConfig,
} from '@/lib/auth/demo'
import { normalizeCnpj } from '@/lib/auth/cnpj'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import type { UserRole } from '@/lib/auth/roles'

type DemoLoginPayload = {
  mode?: 'empresa' | 'admin' | 'clinica'
  cnpj?: string
  email?: string
  password?: string
}

function unauthorized(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: { code: 'AUTH_FAILED', message: 'Credenciais invalidas.' },
    },
    { status: 401 }
  )
}

function setDemoCookie(role: UserRole): NextResponse {
  const response = NextResponse.json({ ok: true, data: { role } }, { status: 200 })
  const config = getDemoCookieConfig()
  response.cookies.set({
    name: config.name,
    value: role,
    httpOnly: config.httpOnly,
    sameSite: config.sameSite,
    secure: config.secure,
    path: config.path,
    maxAge: config.maxAge,
  })
  return response
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!DEMO_MODE_ENABLED) {
    return NextResponse.json(
      { ok: false, error: { code: 'DEMO_DISABLED', message: 'Modo demo desativado.' } },
      { status: 403 }
    )
  }

  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit(`demo-login:${ip}`, { limit: 12, windowMs: 60_000 })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas tentativas. Tente novamente em instantes.' },
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSec),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    )
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > 6_000) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Payload muito grande.' } },
      { status: 413 }
    )
  }

  let payload: DemoLoginPayload
  try {
    payload = (await request.json()) as DemoLoginPayload
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_JSON', message: 'Body JSON invalido.' } },
      { status: 400 }
    )
  }

  if (payload.mode === 'admin') {
    const emailMatches = (payload.email ?? '').trim().toLowerCase() === DEMO_ADMIN_AUTH.email
    const passwordMatches = payload.password === DEMO_ADMIN_AUTH.password
    return emailMatches && passwordMatches ? setDemoCookie('admin') : unauthorized()
  }

  if (payload.mode === 'clinica') {
    const emailMatches = (payload.email ?? '').trim().toLowerCase() === DEMO_CLINIC_AUTH.email
    const passwordMatches = payload.password === DEMO_CLINIC_AUTH.password
    return emailMatches && passwordMatches ? setDemoCookie('clinica') : unauthorized()
  }

  if (payload.mode === 'empresa') {
    const cnpjMatches = normalizeCnpj(payload.cnpj ?? '') === DEMO_COMPANY_AUTH.cnpj
    const passwordMatches = payload.password === DEMO_COMPANY_AUTH.password
    return cnpjMatches && passwordMatches ? setDemoCookie('empresa') : unauthorized()
  }

  return NextResponse.json(
    { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Modo de login invalido.' } },
    { status: 422 }
  )
}
