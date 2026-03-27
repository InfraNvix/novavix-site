import { parseAnalyticsScopeQuery } from '@/lib/validators/analytics-common'

export function parseAnalyticsOverviewQuery(searchParams: URLSearchParams) {
  return parseAnalyticsScopeQuery(searchParams)
}
