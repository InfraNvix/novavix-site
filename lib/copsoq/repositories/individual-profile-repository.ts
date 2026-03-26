import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { CopsoqClassification } from '@/lib/copsoq/types'

type SessionRow = {
  id: string
  status: string
  submitted_at: string | null
  processed_at: string | null
  period_ref: string | null
  company_id: string
  questionnaire_version_id: string
  collaborator_id: string
}

type VersionRow = {
  id: string
  code: string
  title: string
}

type CollaboratorRow = {
  id: string
  external_employee_id: string | null
  full_name: string | null
  email: string | null
  setor_id: string | null
  setor_nome: string | null
  ghe_id: string | null
  ghe_nome: string | null
}

type DimensionScoreRow = {
  score: number
  classification: CopsoqClassification
  dimension_id: string
  dimension: Array<{
    code: string
    name: string
  }> | null
}

export type CopsoqIndividualProfileRecord = {
  session: {
    id: string
    status: string
    submittedAt: string | null
    processedAt: string | null
    periodRef: string | null
    companyId: string
  }
  questionnaire: {
    id: string
    code: string
    title: string
  }
  collaborator: {
    id: string
    externalEmployeeId: string | null
    fullName: string | null
    email: string | null
    setorId: string | null
    setorNome: string | null
    gheId: string | null
    gheNome: string | null
  }
  dimensions: Array<{
    dimensionId: string
    dimensionCode: string
    dimensionName: string
    score: number
    classification: CopsoqClassification
  }>
}

export async function getCopsoqIndividualProfileBySessionId(
  sessionId: string
): Promise<CopsoqIndividualProfileRecord | null> {
  const supabase = getSupabaseAdminClient()

  const { data: sessionData, error: sessionError } = await supabase
    .from('copsoq_response_sessions')
    .select('id, status, submitted_at, processed_at, period_ref, company_id, questionnaire_version_id, collaborator_id')
    .eq('id', sessionId)
    .maybeSingle()

  const session = sessionData as SessionRow | null

  if (sessionError || !session) {
    return null
  }

  const [versionResult, collaboratorResult, dimensionsResult] = await Promise.all([
    supabase
      .from('copsoq_questionnaire_versions')
      .select('id, code, title')
      .eq('id', session.questionnaire_version_id)
      .maybeSingle(),
    supabase
      .from('copsoq_collaborators')
      .select('id, external_employee_id, full_name, email, setor_id, setor_nome, ghe_id, ghe_nome')
      .eq('id', session.collaborator_id)
      .maybeSingle(),
    supabase
      .from('copsoq_individual_dimension_scores')
      .select('score, classification, dimension_id, dimension:copsoq_dimensions!inner(code, name)')
      .eq('session_id', session.id),
  ])

  const version = versionResult.data as VersionRow | null
  const collaborator = collaboratorResult.data as CollaboratorRow | null
  const dimensions = (dimensionsResult.data ?? []) as DimensionScoreRow[]

  if (versionResult.error || !version || collaboratorResult.error || !collaborator || dimensionsResult.error) {
    return null
  }

  const normalizedDimensions = dimensions
    .filter((item) => item.dimension)
    .map((item) => ({
      dimensionId: item.dimension_id,
      dimensionCode: item.dimension![0].code,
      dimensionName: item.dimension![0].name,
      score: Number(Number(item.score).toFixed(2)),
      classification: item.classification,
    }))
    .sort((a, b) => a.dimensionName.localeCompare(b.dimensionName))

  return {
    session: {
      id: session.id,
      status: session.status,
      submittedAt: session.submitted_at,
      processedAt: session.processed_at,
      periodRef: session.period_ref,
      companyId: session.company_id,
    },
    questionnaire: {
      id: version.id,
      code: version.code,
      title: version.title,
    },
    collaborator: {
      id: collaborator.id,
      externalEmployeeId: collaborator.external_employee_id,
      fullName: collaborator.full_name,
      email: collaborator.email,
      setorId: collaborator.setor_id,
      setorNome: collaborator.setor_nome,
      gheId: collaborator.ghe_id,
      gheNome: collaborator.ghe_nome,
    },
    dimensions: normalizedDimensions,
  }
}
