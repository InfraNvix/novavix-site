import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { getCopsoqGroupAggregate } from '@/lib/copsoq/services/group-aggregate'
import { writeCopsoqAuditEvent } from '@/lib/copsoq/services/audit'
import { parseCopsoqAggregateQuery } from '@/lib/validators/copsoq-aggregate'
import {
  canAccessCompanyScope,
  getCopsoqMinRespondentsThreshold,
  resolveCopsoqAccessContext,
} from '@/lib/copsoq/auth/access'

type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'TOO_MANY_REQUESTS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'DOMAIN_ERROR'
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

function mapDomainError(errorCode: string): { status: number; message: string } {
  switch (errorCode) {
    case 'COPSOQ_CATALOG_NOT_FOUND':
      return { status: 404, message: 'Catalogo COPSOQ nao encontrado para a versao informada.' }
    case 'COPSOQ_AGGREGATE_READ_FAILED':
      return { status: 500, message: 'Falha ao consultar agregados COPSOQ.' }
    default:
      return { status: 500, message: 'Falha ao consultar agregacao COPSOQ.' }
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request)

  try {
    const access = await resolveCopsoqAccessContext(request)
    if (!access || !access.canReadAggregate) {
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.read.aggregate',
        eventStatus: 'denied',
        actorMode: access?.mode ?? 'system',
        actorRole: access?.role ?? null,
        actorUserId: access?.userId ?? null,
        actorEmail: access?.loginEmail ?? null,
        endpoint: '/api/copsoq/aggregate',
        httpMethod: 'GET',
        ip,
        errorCode: 'UNAUTHORIZED',
      })
      return errorResponse(401, 'UNAUTHORIZED', 'Acesso nao autorizado aos agregados COPSOQ.')
    }

    const rateLimit = await checkRateLimit(`copsoq-aggregate-read:${ip}`, { limit: 120, windowMs: 60_000 })
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
    const parsed = parseCopsoqAggregateQuery(url.searchParams)
    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Parametros de agregacao invalidos.', parsed.errors)
    }

    if (!canAccessCompanyScope(access, parsed.data.companyId)) {
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.read.aggregate',
        eventStatus: 'denied',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId: parsed.data.companyId,
        endpoint: '/api/copsoq/aggregate',
        httpMethod: 'GET',
        ip,
        errorCode: 'FORBIDDEN_SCOPE',
      })
      return errorResponse(403, 'FORBIDDEN', 'Sem permissao para consultar dados desta empresa.')
    }

    try {
      const result = await getCopsoqGroupAggregate(parsed.data, {
        technicalView: access.isTechnical,
        minRespondents: getCopsoqMinRespondentsThreshold(),
      })
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.read.aggregate',
        eventStatus: 'success',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId: parsed.data.companyId,
        endpoint: '/api/copsoq/aggregate',
        httpMethod: 'GET',
        ip,
        payloadMeta: {
          periodStart: parsed.data.periodStart,
          periodEnd: parsed.data.periodEnd,
          masked: result.privacy.masked,
        },
      })
      return NextResponse.json({ ok: true, data: result }, { status: 200 })
    } catch (error) {
      const code = error instanceof Error ? error.message : 'COPSOQ_AGGREGATE_READ_UNKNOWN_ERROR'
      const mapped = mapDomainError(code)
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.read.aggregate',
        eventStatus: 'failure',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId: parsed.data.companyId,
        endpoint: '/api/copsoq/aggregate',
        httpMethod: 'GET',
        ip,
        errorCode: code,
      })
      return errorResponse(mapped.status, 'DOMAIN_ERROR', mapped.message, [code])
    }
  } catch {
    await writeCopsoqAuditEvent({
      eventName: 'copsoq.read.aggregate',
      eventStatus: 'failure',
      actorMode: 'system',
      endpoint: '/api/copsoq/aggregate',
      httpMethod: 'GET',
      ip,
      errorCode: 'INTERNAL_ERROR',
    })
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao consultar agregacao COPSOQ.')
  }
}
