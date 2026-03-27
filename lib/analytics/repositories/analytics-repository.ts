import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { AnalyticsScopeInput } from '@/lib/analytics/types'

export type AnalyticsFactRow = {
  session_id: string
  company_id: string
  submitted_at: string
  submitted_date: string
  period_ref: string | null
  collaborator_id: string
  collaborator_external_employee_id: string | null
  collaborator_name: string | null
  setor_nome: string | null
  ghe_nome: string | null
  dimension_code: string
  dimension_name: string
  score: number
  classification: 'saudavel' | 'medio_alerta' | 'critico'
}

function applyScopeFilter<T extends { eq: Function; gte: Function; lte: Function; ilike: Function }>(
  query: T,
  scope: AnalyticsScopeInput,
  opts?: { includeCompany?: boolean }
): T {
  let next = query

  if (opts?.includeCompany !== false) {
    next = next.eq('company_id', scope.companyId)
  }

  next = next.gte('submitted_date', scope.periodStart).lte('submitted_date', scope.periodEnd)

  if (scope.setorNome) {
    next = next.ilike('setor_nome', scope.setorNome)
  }

  if (scope.gheNome) {
    next = next.ilike('ghe_nome', scope.gheNome)
  }

  return next
}

export async function fetchAnalyticsFacts(
  scope: AnalyticsScopeInput,
  options?: {
    dimensionCode?: string | null
    includeCompany?: boolean
  }
): Promise<AnalyticsFactRow[]> {
  const supabase = getSupabaseAdminClient()

  let query = supabase
    .from('copsoq_analytics_session_facts')
    .select(
      'session_id, company_id, submitted_at, submitted_date, period_ref, collaborator_id, collaborator_external_employee_id, collaborator_name, setor_nome, ghe_nome, dimension_code, dimension_name, score, classification'
    )

  query = applyScopeFilter(query, scope, { includeCompany: options?.includeCompany })

  if (options?.dimensionCode) {
    query = query.eq('dimension_code', options.dimensionCode)
  }

  const { data, error } = await query

  if (error || !data) {
    throw new Error('ANALYTICS_FACTS_QUERY_FAILED')
  }

  return data as AnalyticsFactRow[]
}

export async function fetchAnalyticsDrilldown(
  scope: AnalyticsScopeInput,
  options: {
    dimensionCode?: string | null
    page: number
    pageSize: number
  }
): Promise<{ rows: AnalyticsFactRow[]; total: number }> {
  const supabase = getSupabaseAdminClient()

  const from = (options.page - 1) * options.pageSize
  const to = from + options.pageSize - 1

  let query = supabase
    .from('copsoq_analytics_session_facts')
    .select(
      'session_id, company_id, submitted_at, submitted_date, period_ref, collaborator_id, collaborator_external_employee_id, collaborator_name, setor_nome, ghe_nome, dimension_code, dimension_name, score, classification',
      { count: 'exact' }
    )

  query = applyScopeFilter(query, scope)

  if (options.dimensionCode) {
    query = query.eq('dimension_code', options.dimensionCode)
  }

  const { data, error, count } = await query.order('submitted_at', { ascending: false }).range(from, to)

  if (error || !data) {
    throw new Error('ANALYTICS_DRILLDOWN_QUERY_FAILED')
  }

  return {
    rows: data as AnalyticsFactRow[],
    total: count ?? 0,
  }
}
