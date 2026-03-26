import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type {
  CopsoqDimensionScore,
  CopsoqQuestionnaireCatalog,
} from '@/lib/copsoq/types'

type DbCatalogVersionRow = {
  id: string
  code: string
  title: string
}

type DbQuestionRow = {
  id: string
  question_number: number
  reverse_scored: boolean
  dimension: Array<{
    id: string
    code: string
    name: string
  }> | null
}

type UpsertCollaboratorInput = {
  companyId: string
  externalEmployeeId: string
  fullName: string | null
  email: string | null
  setorId: string | null
  setorNome: string | null
  gheId: string | null
  gheNome: string | null
}

type CreateSessionInput = {
  questionnaireVersionId: string
  collaboratorId: string
  companyId: string
  periodRef: string | null
}

type InsertAnswerInput = {
  sessionId: string
  questionId: string
  rawValue: number
  score0to100: number
}

export async function getCatalogByQuestionnaireCode(code: string): Promise<CopsoqQuestionnaireCatalog | null> {
  const supabase = getSupabaseAdminClient()

  const { data: version, error: versionError } = await supabase
    .from('copsoq_questionnaire_versions')
    .select('id, code, title')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle()

  if (versionError || !version) {
    return null
  }

  const versionRow = version as DbCatalogVersionRow

  const { data: questions, error: questionsError } = await supabase
    .from('copsoq_questions')
    .select('id, question_number, reverse_scored, dimension:copsoq_dimensions!inner(id, code, name)')
    .eq('version_id', versionRow.id)
    .order('question_number', { ascending: true })

  if (questionsError || !questions) {
    return null
  }

  const questionRows = questions as DbQuestionRow[]

  const normalizedQuestions = questionRows
    .filter((row) => row.dimension)
    .map((row) => ({
      id: row.id,
      questionNumber: row.question_number,
      reverseScored: row.reverse_scored,
      dimension: {
        id: row.dimension![0].id,
        code: row.dimension![0].code,
        name: row.dimension![0].name,
      },
    }))

  return {
    versionId: versionRow.id,
    code: versionRow.code,
    title: versionRow.title,
    questions: normalizedQuestions,
  }
}

export async function upsertCollaborator(input: UpsertCollaboratorInput): Promise<string> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('copsoq_collaborators')
    .upsert(
      {
        company_id: input.companyId,
        external_employee_id: input.externalEmployeeId,
        full_name: input.fullName,
        email: input.email,
        setor_id: input.setorId,
        setor_nome: input.setorNome,
        ghe_id: input.gheId,
        ghe_nome: input.gheNome,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,external_employee_id' }
    )
    .select('id')
    .single()

  const row = data as { id: string } | null

  if (error || !row?.id) {
    throw new Error('COPSOQ_COLLABORATOR_UPSERT_FAILED')
  }

  return row.id
}

export async function createResponseSession(input: CreateSessionInput): Promise<string> {
  const supabase = getSupabaseAdminClient()

  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('copsoq_response_sessions')
    .insert({
      questionnaire_version_id: input.questionnaireVersionId,
      collaborator_id: input.collaboratorId,
      company_id: input.companyId,
      period_ref: input.periodRef,
      status: 'draft',
      submitted_at: null,
      processed_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select('id')
    .single()

  const row = data as { id: string } | null

  if (error || !row?.id) {
    throw new Error('COPSOQ_SESSION_CREATE_FAILED')
  }

  return row.id
}

export async function insertAnswers(rows: InsertAnswerInput[]): Promise<void> {
  if (rows.length === 0) {
    return
  }

  const supabase = getSupabaseAdminClient()

  const { error } = await supabase.from('copsoq_answers').insert(
    rows.map((row) => ({
      session_id: row.sessionId,
      question_id: row.questionId,
      raw_value: row.rawValue,
      score_0_100: row.score0to100,
    }))
  )

  if (error) {
    throw new Error('COPSOQ_ANSWERS_INSERT_FAILED')
  }
}

export async function insertIndividualDimensionScores(
  sessionId: string,
  collaboratorId: string,
  companyId: string,
  dimensions: CopsoqDimensionScore[]
): Promise<void> {
  if (dimensions.length === 0) {
    throw new Error('COPSOQ_DIMENSION_SCORES_EMPTY')
  }

  const supabase = getSupabaseAdminClient()

  const nowIso = new Date().toISOString()

  const { error } = await supabase.from('copsoq_individual_dimension_scores').insert(
    dimensions.map((item) => ({
      session_id: sessionId,
      collaborator_id: collaboratorId,
      company_id: companyId,
      dimension_id: item.dimensionId,
      score: item.score,
      classification: item.classification,
      computed_at: nowIso,
      created_at: nowIso,
    }))
  )

  if (error) {
    throw new Error('COPSOQ_DIMENSION_SCORES_INSERT_FAILED')
  }
}

export async function markResponseSessionProcessed(sessionId: string): Promise<{ submittedAt: string; processedAt: string }> {
  const supabase = getSupabaseAdminClient()

  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('copsoq_response_sessions')
    .update({
      status: 'processed',
      submitted_at: nowIso,
      processed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', sessionId)
    .select('submitted_at, processed_at')
    .single()

  const row = data as { submitted_at: string; processed_at: string } | null

  if (error || !row?.submitted_at || !row?.processed_at) {
    throw new Error('COPSOQ_SESSION_MARK_PROCESSED_FAILED')
  }

  return {
    submittedAt: row.submitted_at,
    processedAt: row.processed_at,
  }
}
