import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { canAccessCompanyScope, resolveCopsoqAccessContext } from '@/lib/copsoq/auth/access'
import { parseAnalyticsDrilldownQuery } from '@/lib/validators/analytics-drilldown'
import { resolveAnalyticsCompanyId, analyticsErrorResponse } from '@/lib/analytics/http'
import { getAnalyticsDrilldown } from '@/lib/analytics/services/analytics-service'

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request)

  try {
    const access = await resolveCopsoqAccessContext(request)
    if (!access || !access.canReadIndividual) {
      return analyticsErrorResponse(401, 'UNAUTHORIZED', 'Acesso nao autorizado ao drilldown individual.')
    }

    const rateLimit = await checkRateLimit(`analytics-drilldown:${ip}`, { limit: 90, windowMs: 60_000 })
    if (!rateLimit.allowed) {
      return analyticsErrorResponse(429, 'TOO_MANY_REQUESTS', 'Rate limit exceeded.')
    }

    const url = new URL(request.url)
    const parsed = parseAnalyticsDrilldownQuery(url.searchParams)
    if (!parsed.success) {
      return analyticsErrorResponse(422, 'VALIDATION_ERROR', 'Parametros invalidos.', parsed.errors)
    }

    const companyId = resolveAnalyticsCompanyId(access, parsed.data.requestedCompanyId)
    if (!companyId) {
      return analyticsErrorResponse(422, 'VALIDATION_ERROR', 'Nao foi possivel resolver companyId no contexto atual.')
    }

    if (!canAccessCompanyScope(access, companyId)) {
      return analyticsErrorResponse(403, 'FORBIDDEN', 'Sem permissao para consultar esta empresa.')
    }

    const result = await getAnalyticsDrilldown({
      scope: {
        companyId,
        periodStart: parsed.data.periodStart,
        periodEnd: parsed.data.periodEnd,
        setorNome: parsed.data.setorNome,
        gheNome: parsed.data.gheNome,
      },
      dimensionCode: parsed.dimensionCode,
      page: parsed.page,
      pageSize: parsed.pageSize,
    })

    return NextResponse.json({ ok: true, data: result }, { status: 200 })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'ANALYTICS_DRILLDOWN_INTERNAL_ERROR'
    return analyticsErrorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao consultar drilldown.', [code])
  }
}
