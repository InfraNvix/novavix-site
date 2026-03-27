type ValidationSuccess<T> = { success: true; data: T }
type ValidationFailure = { success: false; errors: string[] }
export type ParsedAnalyticsScopeQuery = {
  requestedCompanyId: string | null
  periodStart: string
  periodEnd: string
  setorNome: string | null
  gheNome: string | null
}

function asTrimmed(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  return v.length > 0 ? v : null
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function parseAnalyticsScopeQuery(searchParams: URLSearchParams): ValidationSuccess<ParsedAnalyticsScopeQuery> | ValidationFailure {
  const errors: string[] = []

  const now = new Date()
  const startOfMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
  const endOfMonth = (() => {
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    return `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`
  })()

  const requestedCompanyId = asTrimmed(searchParams.get('companyId'))
  const periodStart = asTrimmed(searchParams.get('periodStart'))
  const periodEnd = asTrimmed(searchParams.get('periodEnd'))
  const setorNome = asTrimmed(searchParams.get('setorNome'))
  const gheNome = asTrimmed(searchParams.get('gheNome'))

  const normalizedStart = periodStart ?? startOfMonth
  const normalizedEnd = periodEnd ?? endOfMonth

  if (!isDate(normalizedStart)) errors.push('Campo "periodStart" deve estar no formato YYYY-MM-DD.')
  if (!isDate(normalizedEnd)) errors.push('Campo "periodEnd" deve estar no formato YYYY-MM-DD.')
  if (normalizedStart > normalizedEnd) errors.push('"periodStart" nao pode ser maior que "periodEnd".')

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      requestedCompanyId: requestedCompanyId ?? null,
      periodStart: normalizedStart,
      periodEnd: normalizedEnd,
      setorNome: setorNome ?? null,
      gheNome: gheNome ?? null,
    },
  }
}
