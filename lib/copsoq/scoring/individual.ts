import type {
  CopsoqAnswerInput,
  CopsoqDimensionScore,
  CopsoqQuestionCatalogItem,
} from '@/lib/copsoq/types'
import { classifyCopsoqScore } from '@/lib/copsoq/scoring/classification'
import { toCopsoqScore0to100 } from '@/lib/copsoq/scoring/scale'

type RawDimensionAccumulator = {
  dimensionId: string
  dimensionCode: string
  dimensionName: string
  total: number
  count: number
}

export type ScoredAnswer = {
  questionId: string
  questionNumber: number
  rawValue: number
  score0to100: number
}

export type IndividualScoringResult = {
  scoredAnswers: ScoredAnswer[]
  dimensionScores: CopsoqDimensionScore[]
}

export function calculateCopsoqIndividualScores(
  answers: CopsoqAnswerInput[],
  catalogQuestions: CopsoqQuestionCatalogItem[]
): IndividualScoringResult {
  const catalogByQuestionNumber = new Map<number, CopsoqQuestionCatalogItem>()
  for (const question of catalogQuestions) {
    catalogByQuestionNumber.set(question.questionNumber, question)
  }

  const accumulators = new Map<string, RawDimensionAccumulator>()
  const scoredAnswers: ScoredAnswer[] = []

  for (const answer of answers) {
    const catalogQuestion = catalogByQuestionNumber.get(answer.questionNumber)
    if (!catalogQuestion) {
      continue
    }

    const score0to100 = toCopsoqScore0to100(answer.value, catalogQuestion.reverseScored)

    scoredAnswers.push({
      questionId: catalogQuestion.id,
      questionNumber: answer.questionNumber,
      rawValue: answer.value,
      score0to100,
    })

    const key = catalogQuestion.dimension.id
    const existing = accumulators.get(key)

    if (!existing) {
      accumulators.set(key, {
        dimensionId: catalogQuestion.dimension.id,
        dimensionCode: catalogQuestion.dimension.code,
        dimensionName: catalogQuestion.dimension.name,
        total: score0to100,
        count: 1,
      })
      continue
    }

    existing.total += score0to100
    existing.count += 1
    accumulators.set(key, existing)
  }

  const dimensionScores: CopsoqDimensionScore[] = Array.from(accumulators.values())
    .map((item) => {
      const score = Number((item.total / item.count).toFixed(2))
      return {
        dimensionId: item.dimensionId,
        dimensionCode: item.dimensionCode,
        dimensionName: item.dimensionName,
        score,
        classification: classifyCopsoqScore(score),
      }
    })
    .sort((a, b) => a.dimensionName.localeCompare(b.dimensionName))

  return {
    scoredAnswers,
    dimensionScores,
  }
}
