import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { processCopsoqCollaboratorOrgSync } from '@/lib/copsoq/services/process-collaborator-org-sync'
import { writeCopsoqAuditEvent } from '@/lib/copsoq/services/audit'
import { parseCopsoqCollaboratorOrgSyncPayload } from '@/lib/validators/copsoq-collaborator-org-sync'
import { canAccessCompanyScope, resolveCopsoqAccessContext } from '@/lib/copsoq/auth/access'

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

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request)

  try {
    const access = await resolveCopsoqAccessContext(request)
    if (!access || !access.canRecomputeAggregate) {
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.sync.org_scope',
        eventStatus: 'denied',
        actorMode: access?.mode ?? 'system',
        actorRole: access?.role ?? null,
        actorUserId: access?.userId ?? null,
        actorEmail: access?.loginEmail ?? null,
        endpoint: '/api/copsoq/collaborators/sync-org',
        httpMethod: 'POST',
        ip,
        errorCode: 'UNAUTHORIZED',
      })
      return errorResponse(401, 'UNAUTHORIZED', 'Acesso nao autorizado para sincronizacao organizacional COPSOQ.')
    }

    const rateLimit = await checkRateLimit(`copsoq-org-sync:${ip}`, { limit: 60, windowMs: 60_000 })
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
    if (Number.isFinite(contentLength) && contentLength > 12_000) {
      return errorResponse(413, 'VALIDATION_ERROR', 'Payload too large.')
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Body precisa ser JSON valido.')
    }

    const parsed = parseCopsoqCollaboratorOrgSyncPayload(body)
    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Dados de sincronizacao invalidos.', parsed.errors)
    }

    if (!canAccessCompanyScope(access, parsed.data.companyId)) {
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.sync.org_scope',
        eventStatus: 'denied',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId: parsed.data.companyId,
        endpoint: '/api/copsoq/collaborators/sync-org',
        httpMethod: 'POST',
        ip,
        errorCode: 'FORBIDDEN_SCOPE',
      })
      return errorResponse(403, 'FORBIDDEN', 'Sem permissao para sincronizar dados desta empresa.')
    }

    try {
      const result = await processCopsoqCollaboratorOrgSync(parsed.data)
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.sync.org_scope',
        eventStatus: 'success',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId: parsed.data.companyId,
        endpoint: '/api/copsoq/collaborators/sync-org',
        httpMethod: 'POST',
        ip,
        payloadMeta: {
          externalEmployeeId: parsed.data.externalEmployeeId,
          updated: result.updated,
        },
      })

      return NextResponse.json(
        {
          ok: true,
          data: result,
        },
        { status: 200 }
      )
    } catch (error) {
      const code = error instanceof Error ? error.message : 'COPSOQ_COLLABORATOR_ORG_SYNC_UNKNOWN_ERROR'
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.sync.org_scope',
        eventStatus: 'failure',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId: parsed.data.companyId,
        endpoint: '/api/copsoq/collaborators/sync-org',
        httpMethod: 'POST',
        ip,
        errorCode: code,
      })
      return errorResponse(500, 'DOMAIN_ERROR', 'Falha ao sincronizar escopo organizacional COPSOQ.', [code])
    }
  } catch {
    await writeCopsoqAuditEvent({
      eventName: 'copsoq.sync.org_scope',
      eventStatus: 'failure',
      actorMode: 'system',
      endpoint: '/api/copsoq/collaborators/sync-org',
      httpMethod: 'POST',
      ip,
      errorCode: 'INTERNAL_ERROR',
    })
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao sincronizar escopo organizacional COPSOQ.')
  }
}
