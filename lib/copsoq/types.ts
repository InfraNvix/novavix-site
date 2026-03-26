export type CopsoqClassification = 'saudavel' | 'medio_alerta' | 'critico'

export type CopsoqDimensionScore = {
  dimensionId: string
  dimensionCode: string
  dimensionName: string
  score: number
  classification: CopsoqClassification
}

export type CopsoqQuestionCatalogItem = {
  id: string
  questionNumber: number
  reverseScored: boolean
  dimension: {
    id: string
    code: string
    name: string
  }
}

export type CopsoqQuestionnaireCatalog = {
  versionId: string
  code: string
  title: string
  questions: CopsoqQuestionCatalogItem[]
}

export type CopsoqAnswerInput = {
  questionNumber: number
  value: number
}

export type CopsoqSubmissionInput = {
  questionnaireCode: string
  companyId: string
  periodRef: string | null
  collaborator: {
    externalEmployeeId: string
    fullName: string | null
    email: string | null
    setorId: string | null
    setorNome: string | null
    gheId: string | null
    gheNome: string | null
  }
  answers: CopsoqAnswerInput[]
}

export type CopsoqSubmissionResult = {
  sessionId: string
  questionnaireCode: string
  submittedAt: string
  processedAt: string
  dimensions: CopsoqDimensionScore[]
}
