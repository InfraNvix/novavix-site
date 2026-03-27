import type { ParsedAnalyticsScopeQuery } from '@/lib/validators/analytics-common'
import { parseAnalyticsScopeQuery } from '@/lib/validators/analytics-common'

type ValidationSuccess = {
  success: true
  data: ParsedAnalyticsScopeQuery
  dimensionCode: string | null
  page: number
  pageSize: number
}

type ValidationFailure = { success: false; errors: string[] }

function asTrimmed(value: string | null): string | null {
  if (!value) return null
  const v = value.trim()
  return v.length > 0 ? v : null
}

function toPositiveInt(value: string | null, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.floor(n)
}

export function parseAnalyticsDrilldownQuery(searchParams: URLSearchParams): ValidationSuccess | ValidationFailure {
  const base = parseAnalyticsScopeQuery(searchParams)
  if (!base.success) return base

  const page = toPositiveInt(searchParams.get('page'), 1)
  const pageSize = Math.min(toPositiveInt(searchParams.get('pageSize'), 25), 100)

  return {
    success: true,
    data: base.data,
    dimensionCode: asTrimmed(searchParams.get('dimensionCode')),
    page,
    pageSize,
  }
}
