import { NextResponse } from 'next/server'
import { isDemoCnpj } from '@/lib/auth/cnpj'
import { DEMO_COMPANY_AUTH, DEMO_MODE_ENABLED } from '@/lib/auth/demo'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { parseCompanyLoginPayload } from '@/lib/validators/company-login'

type ApiErrorCode =
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'AUTH_FAILED'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'

function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: string[],
  headers?: Record<string, string>
): NextResponse {
  const response = NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details: details ?? [],
      },
    },
    { status }
  )
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value)
    }
  }
  return response
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ip = getClientIp(request)
    const rateLimit = await checkRateLimit(`company-login:${ip}`, { limit: 8, windowMs: 60_000 })
    if (!rateLimit.allowed) {
      return errorResponse(
        429,
        'TOO_MANY_REQUESTS',
        'Too many attempts. Try again later.',
        [],
        {
          'Retry-After': String(rateLimit.retryAfterSec),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        }
      )
    }

    const contentLength = Number(request.headers.get('content-length') ?? '0')
    if (Number.isFinite(contentLength) && contentLength > 8_000) {
      return errorResponse(413, 'VALIDATION_ERROR', 'Payload too large.')
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Body precisa ser JSON valido.')
    }

    const parsed = parseCompanyLoginPayload(body)
    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Dados de login invalidos.', parsed.errors)
    }

    if (DEMO_MODE_ENABLED) {
      const validDemoCnpj = isDemoCnpj(parsed.data.cnpj)
      const validDemoPassword = parsed.data.password === DEMO_COMPANY_AUTH.password

      if (!validDemoCnpj || !validDemoPassword) {
        return errorResponse(401, 'AUTH_FAILED', 'Credenciais demo invalidas.')
      }

      return NextResponse.json(
        {
          ok: true,
          data: {
            email: DEMO_COMPANY_AUTH.email,
            role: 'empresa',
          },
        },
        { status: 200 }
      )
    }

    const admin = getSupabaseAdminClient()

    const { data, error } = await admin
      .from('user_profiles')
      .select('login_email, role, is_active, companies!inner(cnpj, status)')
      .eq('role', 'empresa')
      .eq('is_active', true)
      .eq('companies.cnpj', parsed.data.cnpj)
      .eq('companies.status', 'active')
      .maybeSingle()

    if (error || !data?.login_email) {
      return errorResponse(401, 'AUTH_FAILED', 'Credenciais invalidas.')
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          email: data.login_email,
          role: data.role,
        },
      },
      { status: 200 }
    )
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao processar login da empresa.')
  }
}
