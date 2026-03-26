import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { CopsoqAggregateScopeInput } from '@/lib/validators/copsoq-aggregate'
import type { CopsoqClassification } from '@/lib/copsoq/types'

type VersionRow = {
  id: string
  code: string
  title: string
}

type IndividualDimensionRow = {
  score: number
  collaborator_id: string
  dimension_id: string
  dimension: Array<{
    code: string
    name: string
  }> | null
  session: Array<{
    submitted_at: string | null
    status: string
    questionnaire_version_id: string
  }> | null
  collaborator: Array<{
    setor_id: string | null
    setor_nome: string | null
    ghe_id: string | null
    ghe_nome: string | null
  }> | null
}

export type AggregateBaseRow = {
  dimensionId: string
  dimensionCode: string
  dimensionName: string
  score: number
  collaboratorId: string
}

export type PersistAggregateRow = {
  dimensionId: string
  respondentCount: number
  meanScore: number
  classification: CopsoqClassification
}

export type AggregateSnapshotRow = {
  respondentCount: number
  meanScore: number
  classification: CopsoqClassification
  dimensionId: string
  dimension: {
    code: string
    name: string
  } | null
}

function toPeriodIsoStart(date: string): string {
  return `${date}T00:00:00.000Z`
}

function toPeriodIsoEnd(date: string): string {
  return `${date}T23:59:59.999Z`
}

export async function getQuestionnaireVersionByCode(code: string): Promise<VersionRow | null> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('copsoq_questionnaire_versions')
    .select('id, code, title')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle()

  const row = data as VersionRow | null

  if (error || !row) {
    return null
  }

  return row
}

export async function fetchIndividualRowsForAggregation(
  scope: CopsoqAggregateScopeInput,
  questionnaireVersionId: string
): Promise<AggregateBaseRow[]> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('copsoq_individual_dimension_scores')
    .select(
      'score, collaborator_id, dimension_id, dimension:copsoq_dimensions!inner(code, name), session:copsoq_response_sessions!inner(submitted_at, status, questionnaire_version_id), collaborator:copsoq_collaborators!inner(setor_id, setor_nome, ghe_id, ghe_nome)'
    )
    .eq('company_id', scope.companyId)
    .eq('session.status', 'processed')
    .eq('session.questionnaire_version_id', questionnaireVersionId)
    .gte('session.submitted_at', toPeriodIsoStart(scope.periodStart))
    .lte('session.submitted_at', toPeriodIsoEnd(scope.periodEnd))

  if (error || !data) {
    throw new Error('COPSOQ_AGGREGATE_SOURCE_QUERY_FAILED')
  }

  const rows = data as IndividualDimensionRow[]

  const scopedRows = rows.filter((row) => {
    const dimension = row.dimension?.[0]
    const collaborator = row.collaborator?.[0]
    if (!dimension || !collaborator) {
      return false
    }

    if (scope.setorId && collaborator.setor_id !== scope.setorId) {
      return false
    }

    if (scope.setorNome && collaborator.setor_nome !== scope.setorNome) {
      return false
    }

    if (scope.gheId && collaborator.ghe_id !== scope.gheId) {
      return false
    }

    if (scope.gheNome && collaborator.ghe_nome !== scope.gheNome) {
      return false
    }

    return true
  })

  return scopedRows.map((row) => ({
    dimensionId: row.dimension_id,
    dimensionCode: row.dimension![0].code,
    dimensionName: row.dimension![0].name,
    score: Number(Number(row.score).toFixed(2)),
    collaboratorId: row.collaborator_id,
  }))
}

export async function replaceGroupAggregateSnapshot(
  scope: CopsoqAggregateScopeInput,
  questionnaireVersionId: string,
  rows: PersistAggregateRow[]
): Promise<void> {
  const supabase = getSupabaseAdminClient()

  let deleteQuery = supabase
    .from('copsoq_group_dimension_aggregates')
    .delete()
    .eq('questionnaire_version_id', questionnaireVersionId)
    .eq('company_id', scope.companyId)
    .eq('period_start', scope.periodStart)
    .eq('period_end', scope.periodEnd)

  if (scope.setorId) {
    deleteQuery = deleteQuery.eq('setor_id', scope.setorId)
  } else {
    deleteQuery = deleteQuery.is('setor_id', null)
  }

  if (scope.setorNome) {
    deleteQuery = deleteQuery.eq('setor_nome', scope.setorNome)
  } else {
    deleteQuery = deleteQuery.is('setor_nome', null)
  }

  if (scope.gheId) {
    deleteQuery = deleteQuery.eq('ghe_id', scope.gheId)
  } else {
    deleteQuery = deleteQuery.is('ghe_id', null)
  }

  if (scope.gheNome) {
    deleteQuery = deleteQuery.eq('ghe_nome', scope.gheNome)
  } else {
    deleteQuery = deleteQuery.is('ghe_nome', null)
  }

  const { error: deleteError } = await deleteQuery

  if (deleteError) {
    throw new Error('COPSOQ_AGGREGATE_DELETE_FAILED')
  }

  if (rows.length === 0) {
    return
  }

  const nowIso = new Date().toISOString()

  const { error: insertError } = await supabase.from('copsoq_group_dimension_aggregates').insert(
    rows.map((row) => ({
      questionnaire_version_id: questionnaireVersionId,
      company_id: scope.companyId,
      setor_id: scope.setorId,
      setor_nome: scope.setorNome,
      ghe_id: scope.gheId,
      ghe_nome: scope.gheNome,
      period_start: scope.periodStart,
      period_end: scope.periodEnd,
      dimension_id: row.dimensionId,
      respondent_count: row.respondentCount,
      mean_score: row.meanScore,
      classification: row.classification,
      computed_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    }))
  )

  if (insertError) {
    throw new Error('COPSOQ_AGGREGATE_INSERT_FAILED')
  }
}

export async function getAggregateSnapshot(
  scope: CopsoqAggregateScopeInput,
  questionnaireVersionId: string
): Promise<AggregateSnapshotRow[]> {
  const supabase = getSupabaseAdminClient()

  let query = supabase
    .from('copsoq_group_dimension_aggregates')
    .select('respondent_count, mean_score, classification, dimension_id, dimension:copsoq_dimensions!inner(code, name)')
    .eq('questionnaire_version_id', questionnaireVersionId)
    .eq('company_id', scope.companyId)
    .eq('period_start', scope.periodStart)
    .eq('period_end', scope.periodEnd)

  if (scope.setorId) {
    query = query.eq('setor_id', scope.setorId)
  } else {
    query = query.is('setor_id', null)
  }

  if (scope.setorNome) {
    query = query.eq('setor_nome', scope.setorNome)
  } else {
    query = query.is('setor_nome', null)
  }

  if (scope.gheId) {
    query = query.eq('ghe_id', scope.gheId)
  } else {
    query = query.is('ghe_id', null)
  }

  if (scope.gheNome) {
    query = query.eq('ghe_nome', scope.gheNome)
  } else {
    query = query.is('ghe_nome', null)
  }

  const { data, error } = await query

  if (error || !data) {
    throw new Error('COPSOQ_AGGREGATE_READ_FAILED')
  }

  const rows = data as Array<{
    respondent_count: number
    mean_score: number
    classification: CopsoqClassification
    dimension_id: string
    dimension: Array<{ code: string; name: string }> | null
  }>

  return rows.map((item) => ({
    respondentCount: item.respondent_count,
    meanScore: Number(Number(item.mean_score).toFixed(2)),
    classification: item.classification,
    dimensionId: item.dimension_id,
    dimension: item.dimension?.[0] ?? null,
  }))
}
