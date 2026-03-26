import { DEFAULT_COPSOQ_QUESTIONNAIRE_CODE } from '@/lib/copsoq/config/constants'

export type CopsoqAggregateScopeInput = {
  questionnaireCode: string
  companyId: string
  periodStart: string
  periodEnd: string
  setorId: string | null
  setorNome: string | null
  gheId: string | null
  gheNome: string | null
}

type AggregateValidationSuccess = {
  success: true
  data: CopsoqAggregateScopeInput
}

type AggregateValidationFailure = {
  success: false
  errors: string[]
}

export type AggregateValidationResult = AggregateValidationSuccess | AggregateValidationFailure

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asOptionalTrimmedString(value: unknown): string | null {
  return asTrimmedString(value) ?? null
}

function isDateYYYYMMDD(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizeScope(input: Record<string, unknown>): AggregateValidationResult {
  const errors: string[] = []

  const questionnaireCode = asOptionalTrimmedString(input.questionnaireCode) ?? DEFAULT_COPSOQ_QUESTIONNAIRE_CODE
  const companyId = asTrimmedString(input.companyId)
  const periodStart = asTrimmedString(input.periodStart)
  const periodEnd = asTrimmedString(input.periodEnd)

  if (!companyId) {
    errors.push('Campo "companyId" e obrigatorio.')
  }

  if (!periodStart || !isDateYYYYMMDD(periodStart)) {
    errors.push('Campo "periodStart" deve estar no formato YYYY-MM-DD.')
  }

  if (!periodEnd || !isDateYYYYMMDD(periodEnd)) {
    errors.push('Campo "periodEnd" deve estar no formato YYYY-MM-DD.')
  }

  if (periodStart && periodEnd && periodStart > periodEnd) {
    errors.push('"periodStart" nao pode ser maior que "periodEnd".')
  }

  if (errors.length > 0 || !companyId || !periodStart || !periodEnd) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      questionnaireCode,
      companyId,
      periodStart,
      periodEnd,
      setorId: asOptionalTrimmedString(input.setorId),
      setorNome: asOptionalTrimmedString(input.setorNome),
      gheId: asOptionalTrimmedString(input.gheId),
      gheNome: asOptionalTrimmedString(input.gheNome),
    },
  }
}

export function parseCopsoqAggregatePayload(input: unknown): AggregateValidationResult {
  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Payload deve ser um objeto JSON valido.'] }
  }

  return normalizeScope(input as Record<string, unknown>)
}

export function parseCopsoqAggregateQuery(searchParams: URLSearchParams): AggregateValidationResult {
  const raw: Record<string, unknown> = {
    questionnaireCode: searchParams.get('questionnaireCode'),
    companyId: searchParams.get('companyId'),
    periodStart: searchParams.get('periodStart'),
    periodEnd: searchParams.get('periodEnd'),
    setorId: searchParams.get('setorId'),
    setorNome: searchParams.get('setorNome'),
    gheId: searchParams.get('gheId'),
    gheNome: searchParams.get('gheNome'),
  }

  return normalizeScope(raw)
}
