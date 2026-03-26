import { classifyCopsoqScore, getCopsoqClassificationLabel } from '@/lib/copsoq/scoring/classification'
import type { CopsoqAggregateScopeInput } from '@/lib/validators/copsoq-aggregate'
import {
  fetchIndividualRowsForAggregation,
  getAggregateSnapshot,
  getQuestionnaireVersionByCode,
  replaceGroupAggregateSnapshot,
  type AggregateBaseRow,
} from '@/lib/copsoq/repositories/group-aggregate-repository'

type AggregateDimensionOutput = {
  dimensionCode: string
  dimensionName: string
  meanScore: number
  respondentCount: number
  classification: 'saudavel' | 'medio_alerta' | 'critico'
  classificationLabel: string
}

type AggregateDimensionComputed = AggregateDimensionOutput & {
  dimensionId: string
}

export type CopsoqGroupAggregateOutput = {
  questionnaire: {
    code: string
    title: string
  }
  group: {
    companyId: string
    setorId: string | null
    setorNome: string | null
    gheId: string | null
    gheNome: string | null
    periodStart: string
    periodEnd: string
  }
  respondentCountTotal: number
  dimensions: AggregateDimensionOutput[]
  summary: {
    saudavel: number
    medioAlerta: number
    critico: number
  }
  privacy: {
    minRespondentsRequired: number
    masked: boolean
    reason: string | null
  }
}

type AggregateBucket = {
  dimensionId: string
  dimensionCode: string
  dimensionName: string
  totalScore: number
  collaboratorIds: Set<string>
}

function buildAggregateFromRows(rows: AggregateBaseRow[]): AggregateDimensionComputed[] {
  const buckets = new Map<string, AggregateBucket>()

  for (const row of rows) {
    const existing = buckets.get(row.dimensionId)
    if (!existing) {
      buckets.set(row.dimensionId, {
        dimensionId: row.dimensionId,
        dimensionCode: row.dimensionCode,
        dimensionName: row.dimensionName,
        totalScore: row.score,
        collaboratorIds: new Set([row.collaboratorId]),
      })
      continue
    }

    existing.totalScore += row.score
    existing.collaboratorIds.add(row.collaboratorId)
    buckets.set(row.dimensionId, existing)
  }

  return Array.from(buckets.values())
    .map((bucket) => {
      const respondentCount = bucket.collaboratorIds.size
      const meanScore = respondentCount > 0 ? Number((bucket.totalScore / respondentCount).toFixed(2)) : 0
      const classification = classifyCopsoqScore(meanScore)

      return {
        dimensionId: bucket.dimensionId,
        dimensionCode: bucket.dimensionCode,
        dimensionName: bucket.dimensionName,
        meanScore,
        respondentCount,
        classification,
        classificationLabel: getCopsoqClassificationLabel(classification),
      }
    })
    .sort((a, b) => a.dimensionName.localeCompare(b.dimensionName))
}

function buildSummary(dimensions: AggregateDimensionOutput[]): CopsoqGroupAggregateOutput['summary'] {
  return dimensions.reduce(
    (acc, item) => {
      if (item.classification === 'saudavel') {
        acc.saudavel += 1
      } else if (item.classification === 'medio_alerta') {
        acc.medioAlerta += 1
      } else {
        acc.critico += 1
      }
      return acc
    },
    { saudavel: 0, medioAlerta: 0, critico: 0 }
  )
}

function buildRespondentCountTotal(rows: AggregateBaseRow[]): number {
  return new Set(rows.map((row) => row.collaboratorId)).size
}

function applyPrivacy(
  output: Omit<CopsoqGroupAggregateOutput, 'privacy'>,
  options: { technicalView: boolean; minRespondents: number }
): CopsoqGroupAggregateOutput {
  if (options.technicalView) {
    return {
      ...output,
      privacy: {
        minRespondentsRequired: options.minRespondents,
        masked: false,
        reason: null,
      },
    }
  }

  if (output.respondentCountTotal >= options.minRespondents) {
    return {
      ...output,
      privacy: {
        minRespondentsRequired: options.minRespondents,
        masked: false,
        reason: null,
      },
    }
  }

  return {
    ...output,
    dimensions: [],
    summary: { saudavel: 0, medioAlerta: 0, critico: 0 },
    privacy: {
      minRespondentsRequired: options.minRespondents,
      masked: true,
      reason: 'Amostra insuficiente para exibicao agregada com confidencialidade.',
    },
  }
}

export async function recomputeCopsoqGroupAggregate(
  scope: CopsoqAggregateScopeInput,
  options?: { technicalView?: boolean; minRespondents?: number }
): Promise<CopsoqGroupAggregateOutput> {
  const technicalView = options?.technicalView ?? true
  const minRespondents = options?.minRespondents ?? 5

  const version = await getQuestionnaireVersionByCode(scope.questionnaireCode)
  if (!version) {
    throw new Error('COPSOQ_CATALOG_NOT_FOUND')
  }

  const baseRows = await fetchIndividualRowsForAggregation(scope, version.id)
  const computedDimensions = buildAggregateFromRows(baseRows)

  await replaceGroupAggregateSnapshot(
    scope,
    version.id,
    computedDimensions.map((item) => ({
      dimensionId: item.dimensionId,
      respondentCount: item.respondentCount,
      meanScore: item.meanScore,
      classification: item.classification,
    }))
  )

  const dimensions: AggregateDimensionOutput[] = computedDimensions.map((item) => ({
    dimensionCode: item.dimensionCode,
    dimensionName: item.dimensionName,
    meanScore: item.meanScore,
    respondentCount: item.respondentCount,
    classification: item.classification,
    classificationLabel: item.classificationLabel,
  }))

  const baseOutput: Omit<CopsoqGroupAggregateOutput, 'privacy'> = {
    questionnaire: {
      code: version.code,
      title: version.title,
    },
    group: {
      companyId: scope.companyId,
      setorId: scope.setorId,
      setorNome: scope.setorNome,
      gheId: scope.gheId,
      gheNome: scope.gheNome,
      periodStart: scope.periodStart,
      periodEnd: scope.periodEnd,
    },
    respondentCountTotal: buildRespondentCountTotal(baseRows),
    dimensions,
    summary: buildSummary(dimensions),
  }

  return applyPrivacy(baseOutput, { technicalView, minRespondents })
}

export async function getCopsoqGroupAggregate(
  scope: CopsoqAggregateScopeInput,
  options?: { technicalView?: boolean; minRespondents?: number }
): Promise<CopsoqGroupAggregateOutput> {
  const technicalView = options?.technicalView ?? false
  const minRespondents = options?.minRespondents ?? 5

  const version = await getQuestionnaireVersionByCode(scope.questionnaireCode)
  if (!version) {
    throw new Error('COPSOQ_CATALOG_NOT_FOUND')
  }

  const snapshot = await getAggregateSnapshot(scope, version.id)

  const dimensions: AggregateDimensionOutput[] = snapshot
    .filter((row) => row.dimension)
    .map((row) => ({
      dimensionCode: row.dimension!.code,
      dimensionName: row.dimension!.name,
      meanScore: row.meanScore,
      respondentCount: row.respondentCount,
      classification: row.classification,
      classificationLabel: getCopsoqClassificationLabel(row.classification),
    }))
    .sort((a, b) => a.dimensionName.localeCompare(b.dimensionName))

  const baseOutput: Omit<CopsoqGroupAggregateOutput, 'privacy'> = {
    questionnaire: {
      code: version.code,
      title: version.title,
    },
    group: {
      companyId: scope.companyId,
      setorId: scope.setorId,
      setorNome: scope.setorNome,
      gheId: scope.gheId,
      gheNome: scope.gheNome,
      periodStart: scope.periodStart,
      periodEnd: scope.periodEnd,
    },
    respondentCountTotal: dimensions.length > 0 ? Math.max(...dimensions.map((item) => item.respondentCount)) : 0,
    dimensions,
    summary: buildSummary(dimensions),
  }

  return applyPrivacy(baseOutput, { technicalView, minRespondents })
}
