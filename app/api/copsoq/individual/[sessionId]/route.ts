import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { getCopsoqIndividualProfile } from '@/lib/copsoq/services/get-individual-profile'
import { writeCopsoqAuditEvent } from '@/lib/copsoq/services/audit'
import { resolveCopsoqAccessContext } from '@/lib/copsoq/auth/access'

type ApiErrorCode = 'VALIDATION_ERROR' | 'TOO_MANY_REQUESTS' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'INTERNAL_ERROR'

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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(
  request: Request,
  context: { params: { sessionId: string } }
): Promise<NextResponse> {
  const ip = getClientIp(request)

  try {
    const access = await resolveCopsoqAccessContext(request)
    if (!access || !access.canReadIndividual) {
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.read.individual',
        eventStatus: 'denied',
        actorMode: access?.mode ?? 'system',
        actorRole: access?.role ?? null,
        actorUserId: access?.userId ?? null,
        actorEmail: access?.loginEmail ?? null,
        endpoint: '/api/copsoq/individual/[sessionId]',
        httpMethod: 'GET',
        ip,
        errorCode: 'UNAUTHORIZED',
      })
      return errorResponse(401, 'UNAUTHORIZED', 'Acesso nao autorizado ao perfil individual COPSOQ.')
    }

    const rateLimit = await checkRateLimit(`copsoq-individual:${ip}`, { limit: 120, windowMs: 60_000 })
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

    const sessionId = context.params.sessionId
    if (!isUuid(sessionId)) {
      return errorResponse(422, 'VALIDATION_ERROR', 'sessionId invalido.')
    }

    const profile = await getCopsoqIndividualProfile(sessionId)
    if (!profile) {
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.read.individual',
        eventStatus: 'failure',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        sessionId,
        endpoint: '/api/copsoq/individual/[sessionId]',
        httpMethod: 'GET',
        ip,
        errorCode: 'NOT_FOUND',
      })
      return errorResponse(404, 'NOT_FOUND', 'Perfil individual COPSOQ nao encontrado para a sessao informada.')
    }

    await writeCopsoqAuditEvent({
      eventName: 'copsoq.read.individual',
      eventStatus: 'success',
      actorMode: access.mode,
      actorRole: access.role,
      actorUserId: access.userId,
      actorEmail: access.loginEmail,
      sessionId,
      companyId: profile.session.companyId,
      endpoint: '/api/copsoq/individual/[sessionId]',
      httpMethod: 'GET',
      ip,
    })

    return NextResponse.json(
      {
        ok: true,
        data: profile,
      },
      { status: 200 }
    )
  } catch {
    await writeCopsoqAuditEvent({
      eventName: 'copsoq.read.individual',
      eventStatus: 'failure',
      actorMode: 'system',
      sessionId: context.params.sessionId,
      endpoint: '/api/copsoq/individual/[sessionId]',
      httpMethod: 'GET',
      ip,
      errorCode: 'INTERNAL_ERROR',
    })
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao consultar perfil individual COPSOQ.')
  }
}
