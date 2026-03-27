import type { AnalyticsDistributionGroupBy } from '@/lib/analytics/types'
import type { ParsedAnalyticsScopeQuery } from '@/lib/validators/analytics-common'
import { parseAnalyticsScopeQuery } from '@/lib/validators/analytics-common'

type ValidationSuccess = {
  success: true
  data: ParsedAnalyticsScopeQuery
  groupBy: AnalyticsDistributionGroupBy
  metric: 'avg_risk' | 'respondents'
}

type ValidationFailure = { success: false; errors: string[] }

function asTrimmed(value: string | null): string | null {
  if (!value) return null
  const v = value.trim()
  return v.length > 0 ? v : null
}

export function parseAnalyticsDistributionQuery(searchParams: URLSearchParams): ValidationSuccess | ValidationFailure {
  const base = parseAnalyticsScopeQuery(searchParams)
  if (!base.success) return base

  const rawGroupBy = asTrimmed(searchParams.get('groupBy'))
  const rawMetric = asTrimmed(searchParams.get('metric'))

  const groupBy: AnalyticsDistributionGroupBy =
    rawGroupBy === 'ghe' || rawGroupBy === 'empresa' ? rawGroupBy : 'setor'
  const metric: 'avg_risk' | 'respondents' = rawMetric === 'respondents' ? 'respondents' : 'avg_risk'

  return { success: true, data: base.data, groupBy, metric }
}
