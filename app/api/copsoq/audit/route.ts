import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveCopsoqAccessContext } from '@/lib/copsoq/auth/access'

type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'TOO_MANY_REQUESTS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
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

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? '50')
  if (!Number.isFinite(parsed)) {
    return 50
  }
  return Math.max(1, Math.min(200, Math.floor(parsed)))
}

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request)

  try {
    const access = await resolveCopsoqAccessContext(request)
    if (!access) {
      return errorResponse(401, 'UNAUTHORIZED', 'Acesso nao autorizado aos eventos COPSOQ.')
    }

    if (!access.isTechnical) {
      return errorResponse(403, 'FORBIDDEN', 'Acesso restrito a perfis tecnicos.')
    }

    const rateLimit = await checkRateLimit(`copsoq-audit-read:${ip}`, { limit: 120, windowMs: 60_000 })
    if (!rateLimit.allowed) {
      return errorResponse(
        429,
        'TOO_MANY_REQUESTS',
        'Rate limit exceeded.',
        [],
        {
          'Retry-After': String(rateLimit.retryAfterSec),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        }
      )
    }

    const url = new URL(request.url)
    const companyId = url.searchParams.get('companyId')
    const eventName = url.searchParams.get('eventName')
    const eventStatus = url.searchParams.get('eventStatus')
    const limit = parseLimit(url.searchParams.get('limit'))

    const supabase = getSupabaseAdminClient()

    let query = supabase
      .from('copsoq_audit_events')
      .select(
        'id, event_name, event_status, actor_mode, actor_role, actor_user_id, actor_email, company_id, session_id, endpoint, http_method, ip, payload_meta, error_code, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    if (eventName) {
      query = query.eq('event_name', eventName)
    }

    if (eventStatus) {
      query = query.eq('event_status', eventStatus)
    }

    const { data, error } = await query

    if (error) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao consultar eventos de auditoria COPSOQ.')
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          filters: {
            companyId,
            eventName,
            eventStatus,
            limit,
          },
          events: data ?? [],
        },
      },
      { status: 200 }
    )
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao consultar auditoria COPSOQ.')
  }
}
