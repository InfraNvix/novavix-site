import type { AnalyticsGrain } from '@/lib/analytics/types'
import type { ParsedAnalyticsScopeQuery } from '@/lib/validators/analytics-common'
import { parseAnalyticsScopeQuery } from '@/lib/validators/analytics-common'

type ValidationSuccess = {
  success: true
  data: ParsedAnalyticsScopeQuery
  grain: AnalyticsGrain
  metric: 'avg_risk' | 'respondents' | 'response_rate'
}

type ValidationFailure = {
  success: false
  errors: string[]
}

function asTrimmed(value: string | null): string | null {
  if (!value) return null
  const v = value.trim()
  return v.length > 0 ? v : null
}

export function parseAnalyticsTimeseriesQuery(searchParams: URLSearchParams): ValidationSuccess | ValidationFailure {
  const base = parseAnalyticsScopeQuery(searchParams)
  if (!base.success) {
    return base
  }

  const rawGrain = asTrimmed(searchParams.get('grain'))
  const rawMetric = asTrimmed(searchParams.get('metric'))

  const grain: AnalyticsGrain = rawGrain === 'week' || rawGrain === 'month' ? rawGrain : 'day'
  const metric = rawMetric === 'respondents' || rawMetric === 'response_rate' ? rawMetric : 'avg_risk'

  return {
    success: true,
    data: base.data,
    grain,
    metric,
  }
}
