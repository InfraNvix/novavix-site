import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { writeCopsoqAuditEvent } from '@/lib/copsoq/services/audit'
import { canAccessCompanyScope, resolveCopsoqAccessContext } from '@/lib/copsoq/auth/access'
import { parseAnalyticsTimeseriesQuery } from '@/lib/validators/analytics-timeseries'
import { resolveAnalyticsCompanyId, analyticsErrorResponse } from '@/lib/analytics/http'
import { getAnalyticsTimeseries } from '@/lib/analytics/services/analytics-service'

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request)

  try {
    const access = await resolveCopsoqAccessContext(request)
    if (!access || !access.canReadAggregate) {
      return analyticsErrorResponse(401, 'UNAUTHORIZED', 'Acesso nao autorizado ao analytics.')
    }

    const rateLimit = await checkRateLimit(`analytics-timeseries:${ip}`, { limit: 120, windowMs: 60_000 })
    if (!rateLimit.allowed) {
      return analyticsErrorResponse(429, 'TOO_MANY_REQUESTS', 'Rate limit exceeded.')
    }

    const url = new URL(request.url)
    const parsed = parseAnalyticsTimeseriesQuery(url.searchParams)
    if (!parsed.success) {
      return analyticsErrorResponse(422, 'VALIDATION_ERROR', 'Parametros invalidos.', parsed.errors)
    }

    const companyId = resolveAnalyticsCompanyId(access, parsed.data.requestedCompanyId)
    if (!companyId) {
      return analyticsErrorResponse(422, 'VALIDATION_ERROR', 'Nao foi possivel resolver companyId no contexto atual.')
    }

    if (!canAccessCompanyScope(access, companyId)) {
      await writeCopsoqAuditEvent({
        eventName: 'analytics.read.timeseries',
        eventStatus: 'denied',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId,
        endpoint: '/api/analytics/timeseries',
        httpMethod: 'GET',
        ip,
        errorCode: 'FORBIDDEN_SCOPE',
      })
      return analyticsErrorResponse(403, 'FORBIDDEN', 'Sem permissao para consultar esta empresa.')
    }

    const result = await getAnalyticsTimeseries({
      scope: {
        companyId,
        periodStart: parsed.data.periodStart,
        periodEnd: parsed.data.periodEnd,
        setorNome: parsed.data.setorNome,
        gheNome: parsed.data.gheNome,
      },
      grain: parsed.grain,
      metric: parsed.metric,
    })

    return NextResponse.json({ ok: true, data: result }, { status: 200 })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'ANALYTICS_TIMESERIES_INTERNAL_ERROR'
    await writeCopsoqAuditEvent({
      eventName: 'analytics.read.timeseries',
      eventStatus: 'failure',
      actorMode: 'system',
      endpoint: '/api/analytics/timeseries',
      httpMethod: 'GET',
      ip,
      errorCode: code,
    })
    return analyticsErrorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao consultar serie temporal.', [code])
  }
}
