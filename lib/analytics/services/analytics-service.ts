import type {
  AnalyticsBenchmarkOutput,
  AnalyticsDistributionGroupBy,
  AnalyticsDistributionOutput,
  AnalyticsDrilldownOutput,
  AnalyticsGrain,
  AnalyticsOverviewOutput,
  AnalyticsScopeInput,
  AnalyticsTimeseriesOutput,
} from '@/lib/analytics/types'
import {
  fetchAnalyticsDrilldown,
  fetchAnalyticsFacts,
  type AnalyticsFactRow,
} from '@/lib/analytics/repositories/analytics-repository'

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return Number((values.reduce((acc, v) => acc + v, 0) / values.length).toFixed(2))
}

function classificationFromScore(score: number): 'saudavel' | 'medio_alerta' | 'critico' {
  if (score >= 75) return 'critico'
  if (score >= 26) return 'medio_alerta'
  return 'saudavel'
}

function toIsoDate(value: string): string {
  return value.slice(0, 10)
}

function toWeekKey(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`)
  const firstJan = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const dayOfYear = Math.floor((date.getTime() - firstJan.getTime()) / 86400000) + 1
  const week = Math.ceil(dayOfYear / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function toMonthKey(dateIso: string): string {
  return dateIso.slice(0, 7)
}

function dateDiffInDays(start: string, end: string): number {
  const startTime = new Date(`${start}T00:00:00.000Z`).getTime()
  const endTime = new Date(`${end}T00:00:00.000Z`).getTime()
  return Math.max(1, Math.floor((endTime - startTime) / 86400000) + 1)
}

function shiftDate(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function uniqueRespondents(rows: AnalyticsFactRow[]): number {
  return new Set(rows.map((row) => row.collaborator_id)).size
}

function calcResponseRate(rows: AnalyticsFactRow[]): number {
  const respondents = uniqueRespondents(rows)
  if (respondents === 0) return 0

  const dimensionCount = new Set(rows.map((row) => row.dimension_code)).size
  if (dimensionCount === 0) return 0

  const expected = respondents * dimensionCount
  if (expected === 0) return 0

  return Number(Math.min(100, (rows.length / expected) * 100).toFixed(2))
}

export async function getAnalyticsOverview(scope: AnalyticsScopeInput): Promise<AnalyticsOverviewOutput> {
  const rows = await fetchAnalyticsFacts(scope)

  const byDimension = new Map<string, { name: string; scores: number[] }>()
  for (const row of rows) {
    const current = byDimension.get(row.dimension_code)
    if (!current) {
      byDimension.set(row.dimension_code, { name: row.dimension_name, scores: [Number(row.score)] })
      continue
    }
    current.scores.push(Number(row.score))
  }

  const dimensions = Array.from(byDimension.entries())
    .map(([dimensionCode, payload]) => {
      const meanScore = avg(payload.scores)
      return {
        dimensionCode,
        dimensionName: payload.name,
        meanScore,
        classification: classificationFromScore(meanScore),
      }
    })
    .sort((a, b) => b.meanScore - a.meanScore)

  const criticalDimensions = dimensions.filter((item) => item.classification === 'critico').length
  const alertDimensions = dimensions.filter((item) => item.classification === 'medio_alerta').length
  const healthyDimensions = dimensions.filter((item) => item.classification === 'saudavel').length

  return {
    scope,
    kpis: {
      respondents: uniqueRespondents(rows),
      avgRiskScore: avg(rows.map((item) => Number(item.score))),
      criticalDimensions,
      alertDimensions,
      healthyDimensions,
      responseRate: calcResponseRate(rows),
      topRiskDimension:
        dimensions[0] !== undefined
          ? {
              dimensionCode: dimensions[0].dimensionCode,
              dimensionName: dimensions[0].dimensionName,
              score: dimensions[0].meanScore,
            }
          : null,
    },
    dimensions,
  }
}

export async function getAnalyticsTimeseries(input: {
  scope: AnalyticsScopeInput
  grain: AnalyticsGrain
  metric: 'avg_risk' | 'respondents' | 'response_rate'
}): Promise<AnalyticsTimeseriesOutput> {
  const rows = await fetchAnalyticsFacts(input.scope)

  const buckets = new Map<string, AnalyticsFactRow[]>()
  for (const row of rows) {
    const dateKey = toIsoDate(row.submitted_at)
    const bucket =
      input.grain === 'month' ? toMonthKey(dateKey) : input.grain === 'week' ? toWeekKey(dateKey) : dateKey

    const current = buckets.get(bucket) ?? []
    current.push(row)
    buckets.set(bucket, current)
  }

  const series = Array.from(buckets.entries())
    .map(([bucket, bucketRows]) => {
      let value = 0
      if (input.metric === 'avg_risk') {
        value = avg(bucketRows.map((item) => Number(item.score)))
      } else if (input.metric === 'respondents') {
        value = uniqueRespondents(bucketRows)
      } else {
        value = calcResponseRate(bucketRows)
      }

      return { bucket, value: Number(value.toFixed(2)) }
    })
    .sort((a, b) => a.bucket.localeCompare(b.bucket))

  return {
    scope: input.scope,
    grain: input.grain,
    metric: input.metric,
    series,
  }
}

export async function getAnalyticsDistribution(input: {
  scope: AnalyticsScopeInput
  groupBy: AnalyticsDistributionGroupBy
  metric: 'avg_risk' | 'respondents'
}): Promise<AnalyticsDistributionOutput> {
  const rows = await fetchAnalyticsFacts(input.scope)

  const getGroup = (row: AnalyticsFactRow): { key: string; label: string } => {
    if (input.groupBy === 'ghe') {
      const label = row.ghe_nome?.trim() || 'Sem GHE'
      return { key: label.toLowerCase(), label }
    }

    if (input.groupBy === 'empresa') {
      return { key: row.company_id, label: 'Empresa (escopo)' }
    }

    const label = row.setor_nome?.trim() || 'Sem Setor'
    return { key: label.toLowerCase(), label }
  }

  const grouped = new Map<string, { label: string; rows: AnalyticsFactRow[] }>()

  for (const row of rows) {
    const group = getGroup(row)
    const current = grouped.get(group.key)
    if (!current) {
      grouped.set(group.key, { label: group.label, rows: [row] })
      continue
    }
    current.rows.push(row)
  }

  const outputRows = Array.from(grouped.entries())
    .map(([groupKey, payload]) => {
      const respondents = uniqueRespondents(payload.rows)
      const value = input.metric === 'respondents' ? respondents : avg(payload.rows.map((item) => Number(item.score)))

      return {
        groupKey,
        groupLabel: payload.label,
        value: Number(value.toFixed(2)),
        respondents,
      }
    })
    .sort((a, b) => b.value - a.value)

  return {
    scope: input.scope,
    groupBy: input.groupBy,
    metric: input.metric,
    rows: outputRows,
  }
}

export async function getAnalyticsBenchmark(input: {
  scope: AnalyticsScopeInput
  dimensionCode: string | null
}): Promise<AnalyticsBenchmarkOutput> {
  const currentRows = await fetchAnalyticsFacts(input.scope, { dimensionCode: input.dimensionCode })
  const companyCurrentMean = avg(currentRows.map((row) => Number(row.score)))

  const days = dateDiffInDays(input.scope.periodStart, input.scope.periodEnd)
  const previousEnd = shiftDate(input.scope.periodStart, -1)
  const previousStart = shiftDate(previousEnd, -(days - 1))

  const previousRows = await fetchAnalyticsFacts(
    {
      ...input.scope,
      periodStart: previousStart,
      periodEnd: previousEnd,
    },
    { dimensionCode: input.dimensionCode }
  )

  const previousMean = previousRows.length > 0 ? avg(previousRows.map((row) => Number(row.score))) : null

  const marketRows = await fetchAnalyticsFacts(input.scope, {
    dimensionCode: input.dimensionCode,
    includeCompany: false,
  })

  const marketMean = marketRows.length > 0 ? avg(marketRows.map((row) => Number(row.score))) : null

  return {
    scope: input.scope,
    dimensionCode: input.dimensionCode,
    company: {
      currentMean: companyCurrentMean,
      previousMean,
      variation: previousMean === null ? null : Number((companyCurrentMean - previousMean).toFixed(2)),
    },
    peers: {
      marketMean,
      deltaVsMarket: marketMean === null ? null : Number((companyCurrentMean - marketMean).toFixed(2)),
    },
  }
}

export async function getAnalyticsDrilldown(input: {
  scope: AnalyticsScopeInput
  dimensionCode: string | null
  page: number
  pageSize: number
}): Promise<AnalyticsDrilldownOutput> {
  const { rows, total } = await fetchAnalyticsDrilldown(input.scope, {
    dimensionCode: input.dimensionCode,
    page: input.page,
    pageSize: input.pageSize,
  })

  return {
    scope: input.scope,
    dimensionCode: input.dimensionCode,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
    },
    rows: rows.map((row) => ({
      sessionId: row.session_id,
      submittedAt: row.submitted_at,
      periodRef: row.period_ref,
      collaboratorExternalEmployeeId: row.collaborator_external_employee_id,
      collaboratorName: row.collaborator_name,
      setorNome: row.setor_nome,
      gheNome: row.ghe_nome,
      dimensionCode: row.dimension_code,
      dimensionName: row.dimension_name,
      score: Number(Number(row.score).toFixed(2)),
      classification: row.classification,
    })),
  }
}
