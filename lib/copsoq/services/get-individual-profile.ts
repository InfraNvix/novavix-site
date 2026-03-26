import { getCopsoqClassificationLabel } from '@/lib/copsoq/scoring/classification'
import { getCopsoqIndividualProfileBySessionId } from '@/lib/copsoq/repositories/individual-profile-repository'

export type CopsoqIndividualProfileOutput = {
  session: {
    id: string
    status: string
    submittedAt: string | null
    processedAt: string | null
    periodRef: string | null
    companyId: string
  }
  questionnaire: {
    code: string
    title: string
  }
  collaborator: {
    externalEmployeeId: string | null
    fullName: string | null
    setorNome: string | null
    gheNome: string | null
  }
  dimensions: Array<{
    dimensionCode: string
    dimensionName: string
    score: number
    classification: string
    classificationLabel: string
  }>
  radar: Array<{
    axis: string
    value: number
  }>
  alerts: Array<{
    dimensionCode: string
    dimensionName: string
    score: number
    severity: 'imediata'
    message: string
  }>
}

export async function getCopsoqIndividualProfile(
  sessionId: string
): Promise<CopsoqIndividualProfileOutput | null> {
  const record = await getCopsoqIndividualProfileBySessionId(sessionId)
  if (!record) {
    return null
  }

  const dimensions = record.dimensions.map((item) => ({
    dimensionCode: item.dimensionCode,
    dimensionName: item.dimensionName,
    score: item.score,
    classification: item.classification,
    classificationLabel: getCopsoqClassificationLabel(item.classification),
  }))

  const radar = dimensions.map((item) => ({
    axis: item.dimensionName,
    value: item.score,
  }))

  const alerts = dimensions
    .filter((item) => item.classification === 'critico')
    .map((item) => ({
      dimensionCode: item.dimensionCode,
      dimensionName: item.dimensionName,
      score: item.score,
      severity: 'imediata' as const,
      message: 'Dimensao com risco alto; recomenda-se analise tecnica imediata.',
    }))

  return {
    session: record.session,
    questionnaire: {
      code: record.questionnaire.code,
      title: record.questionnaire.title,
    },
    collaborator: {
      externalEmployeeId: record.collaborator.externalEmployeeId,
      fullName: record.collaborator.fullName,
      setorNome: record.collaborator.setorNome,
      gheNome: record.collaborator.gheNome,
    },
    dimensions,
    radar,
    alerts,
  }
}
