import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { recomputeCopsoqGroupAggregate } from '@/lib/copsoq/services/group-aggregate'
import { writeCopsoqAuditEvent } from '@/lib/copsoq/services/audit'
import { parseCopsoqAggregatePayload } from '@/lib/validators/copsoq-aggregate'
import {
  canAccessCompanyScope,
  getCopsoqMinRespondentsThreshold,
  resolveCopsoqAccessContext,
} from '@/lib/copsoq/auth/access'

type ApiErrorCode =
  | 'INVALID_JSON'
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
    case 'COPSOQ_AGGREGATE_SOURCE_QUERY_FAILED':
    case 'COPSOQ_AGGREGATE_DELETE_FAILED':
    case 'COPSOQ_AGGREGATE_INSERT_FAILED':
      return { status: 500, message: 'Falha ao consolidar agregados COPSOQ.' }
    default:
      return { status: 500, message: 'Falha ao processar agregacao COPSOQ.' }
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request)

  try {
    const access = await resolveCopsoqAccessContext(request)
    if (!access || !access.canRecomputeAggregate) {
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.recompute.aggregate',
        eventStatus: 'denied',
        actorMode: access?.mode ?? 'system',
        actorRole: access?.role ?? null,
        actorUserId: access?.userId ?? null,
        actorEmail: access?.loginEmail ?? null,
        endpoint: '/api/copsoq/aggregate/recompute',
        httpMethod: 'POST',
        ip,
        errorCode: 'UNAUTHORIZED',
      })
      return errorResponse(401, 'UNAUTHORIZED', 'Acesso nao autorizado para consolidacao COPSOQ.')
    }

    const rateLimit = await checkRateLimit(`copsoq-aggregate-recompute:${ip}`, { limit: 30, windowMs: 60_000 })
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

    const contentLength = Number(request.headers.get('content-length') ?? '0')
    if (Number.isFinite(contentLength) && contentLength > 20_000) {
      return errorResponse(413, 'VALIDATION_ERROR', 'Payload too large.')
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Body precisa ser JSON valido.')
    }

    const parsed = parseCopsoqAggregatePayload(body)
    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Dados de agregacao invalidos.', parsed.errors)
    }

    if (!canAccessCompanyScope(access, parsed.data.companyId)) {
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.recompute.aggregate',
        eventStatus: 'denied',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId: parsed.data.companyId,
        endpoint: '/api/copsoq/aggregate/recompute',
        httpMethod: 'POST',
        ip,
        errorCode: 'FORBIDDEN_SCOPE',
      })
      return errorResponse(403, 'FORBIDDEN', 'Sem permissao para consolidar dados desta empresa.')
    }

    try {
      const result = await recomputeCopsoqGroupAggregate(parsed.data, {
        technicalView: access.isTechnical,
        minRespondents: getCopsoqMinRespondentsThreshold(),
      })
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.recompute.aggregate',
        eventStatus: 'success',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId: parsed.data.companyId,
        endpoint: '/api/copsoq/aggregate/recompute',
        httpMethod: 'POST',
        ip,
        payloadMeta: {
          periodStart: parsed.data.periodStart,
          periodEnd: parsed.data.periodEnd,
          masked: result.privacy.masked,
        },
      })
      return NextResponse.json({ ok: true, data: result }, { status: 200 })
    } catch (error) {
      const code = error instanceof Error ? error.message : 'COPSOQ_AGGREGATE_UNKNOWN_ERROR'
      const mapped = mapDomainError(code)
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.recompute.aggregate',
        eventStatus: 'failure',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId: parsed.data.companyId,
        endpoint: '/api/copsoq/aggregate/recompute',
        httpMethod: 'POST',
        ip,
        errorCode: code,
      })
      return errorResponse(mapped.status, 'DOMAIN_ERROR', mapped.message, [code])
    }
  } catch {
    await writeCopsoqAuditEvent({
      eventName: 'copsoq.recompute.aggregate',
      eventStatus: 'failure',
      actorMode: 'system',
      endpoint: '/api/copsoq/aggregate/recompute',
      httpMethod: 'POST',
      ip,
      errorCode: 'INTERNAL_ERROR',
    })
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao processar agregacao COPSOQ.')
  }
}
