import type { ParsedAnalyticsScopeQuery } from '@/lib/validators/analytics-common'
import { parseAnalyticsScopeQuery } from '@/lib/validators/analytics-common'

type ValidationSuccess = {
  success: true
  data: ParsedAnalyticsScopeQuery
  dimensionCode: string | null
}

type ValidationFailure = { success: false; errors: string[] }

function asTrimmed(value: string | null): string | null {
  if (!value) return null
  const v = value.trim()
  return v.length > 0 ? v : null
}

export function parseAnalyticsBenchmarkQuery(searchParams: URLSearchParams): ValidationSuccess | ValidationFailure {
  const base = parseAnalyticsScopeQuery(searchParams)
  if (!base.success) return base

  return {
    success: true,
    data: base.data,
    dimensionCode: asTrimmed(searchParams.get('dimensionCode')),
  }
}
