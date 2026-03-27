import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { writeCopsoqAuditEvent } from '@/lib/copsoq/services/audit'
import { canAccessCompanyScope, resolveCopsoqAccessContext } from '@/lib/copsoq/auth/access'
import { parseAnalyticsOverviewQuery } from '@/lib/validators/analytics-overview'
import { resolveAnalyticsCompanyId, analyticsErrorResponse } from '@/lib/analytics/http'
import { getAnalyticsOverview } from '@/lib/analytics/services/analytics-service'

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request)

  try {
    const access = await resolveCopsoqAccessContext(request)
    if (!access || !access.canReadAggregate) {
      await writeCopsoqAuditEvent({
        eventName: 'analytics.read.overview',
        eventStatus: 'denied',
        actorMode: access?.mode ?? 'system',
        actorRole: access?.role ?? null,
        actorUserId: access?.userId ?? null,
        actorEmail: access?.loginEmail ?? null,
        endpoint: '/api/analytics/overview',
        httpMethod: 'GET',
        ip,
        errorCode: 'UNAUTHORIZED',
      })
      return analyticsErrorResponse(401, 'UNAUTHORIZED', 'Acesso nao autorizado ao analytics.')
    }

    const rateLimit = await checkRateLimit(`analytics-overview:${ip}`, { limit: 120, windowMs: 60_000 })
    if (!rateLimit.allowed) {
      return analyticsErrorResponse(
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
    const parsed = parseAnalyticsOverviewQuery(url.searchParams)

    if (!parsed.success) {
      return analyticsErrorResponse(422, 'VALIDATION_ERROR', 'Parametros invalidos.', parsed.errors)
    }

    const companyId = resolveAnalyticsCompanyId(access, parsed.data.requestedCompanyId)
    if (!companyId) {
      return analyticsErrorResponse(422, 'VALIDATION_ERROR', 'Nao foi possivel resolver companyId no contexto atual.')
    }

    if (!canAccessCompanyScope(access, companyId)) {
      await writeCopsoqAuditEvent({
        eventName: 'analytics.read.overview',
        eventStatus: 'denied',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId,
        endpoint: '/api/analytics/overview',
        httpMethod: 'GET',
        ip,
        errorCode: 'FORBIDDEN_SCOPE',
      })
      return analyticsErrorResponse(403, 'FORBIDDEN', 'Sem permissao para consultar esta empresa.')
    }

    const scope = {
      companyId,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      setorNome: parsed.data.setorNome,
      gheNome: parsed.data.gheNome,
    }

    const result = await getAnalyticsOverview(scope)

    await writeCopsoqAuditEvent({
      eventName: 'analytics.read.overview',
      eventStatus: 'success',
      actorMode: access.mode,
      actorRole: access.role,
      actorUserId: access.userId,
      actorEmail: access.loginEmail,
      companyId,
      endpoint: '/api/analytics/overview',
      httpMethod: 'GET',
      ip,
      payloadMeta: {
        periodStart: scope.periodStart,
        periodEnd: scope.periodEnd,
      },
    })

    return NextResponse.json({ ok: true, data: result }, { status: 200 })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'ANALYTICS_OVERVIEW_INTERNAL_ERROR'
    await writeCopsoqAuditEvent({
      eventName: 'analytics.read.overview',
      eventStatus: 'failure',
      actorMode: 'system',
      endpoint: '/api/analytics/overview',
      httpMethod: 'GET',
      ip,
      errorCode: code,
    })
    return analyticsErrorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao consultar analytics.', [code])
  }
}
