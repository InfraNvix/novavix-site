export type AnalyticsGrain = 'day' | 'week' | 'month'
export type AnalyticsDistributionGroupBy = 'setor' | 'ghe' | 'empresa'

export type AnalyticsScopeInput = {
  companyId: string | null
  periodStart: string
  periodEnd: string
  setorNome: string | null
  gheNome: string | null
}

export type AnalyticsOverviewOutput = {
  scope: AnalyticsScopeInput
  kpis: {
    respondents: number
    avgRiskScore: number
    criticalDimensions: number
    alertDimensions: number
    healthyDimensions: number
    responseRate: number
    topRiskDimension: {
      dimensionCode: string
      dimensionName: string
      score: number
    } | null
  }
  dimensions: Array<{
    dimensionCode: string
    dimensionName: string
    meanScore: number
    classification: 'saudavel' | 'medio_alerta' | 'critico'
  }>
}

export type AnalyticsTimeseriesOutput = {
  scope: AnalyticsScopeInput
  grain: AnalyticsGrain
  metric: 'avg_risk' | 'respondents' | 'response_rate'
  series: Array<{
    bucket: string
    value: number
  }>
}

export type AnalyticsDistributionOutput = {
  scope: AnalyticsScopeInput
  groupBy: AnalyticsDistributionGroupBy
  metric: 'avg_risk' | 'respondents'
  rows: Array<{
    groupKey: string
    groupLabel: string
    value: number
    respondents: number
  }>
}

export type AnalyticsBenchmarkOutput = {
  scope: AnalyticsScopeInput
  dimensionCode: string | null
  company: {
    currentMean: number
    previousMean: number | null
    variation: number | null
  }
  peers: {
    marketMean: number | null
    deltaVsMarket: number | null
  }
}

export type AnalyticsDrilldownOutput = {
  scope: AnalyticsScopeInput
  dimensionCode: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
  }
  rows: Array<{
    companyId: string
    sessionId: string
    submittedAt: string
    periodRef: string | null
    collaboratorExternalEmployeeId: string | null
    collaboratorName: string | null
    setorNome: string | null
    gheNome: string | null
    dimensionCode: string
    dimensionName: string
    score: number
    classification: 'saudavel' | 'medio_alerta' | 'critico'
  }>
}
