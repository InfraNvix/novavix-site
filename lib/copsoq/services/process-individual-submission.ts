import {
  COPSOQ_EXPECTED_SHORT_QUESTION_COUNT,
  DEFAULT_COPSOQ_QUESTIONNAIRE_CODE,
} from '@/lib/copsoq/config/constants'
import { calculateCopsoqIndividualScores } from '@/lib/copsoq/scoring/individual'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type {
  CopsoqSubmissionInput,
  CopsoqSubmissionResult,
} from '@/lib/copsoq/types'
import {
  createResponseSession,
  getCatalogByQuestionnaireCode,
  insertAnswers,
  insertIndividualDimensionScores,
  markResponseSessionProcessed,
  upsertCollaborator,
} from '@/lib/copsoq/repositories/submission-repository'

function deduplicateAnswerNumbers(answers: CopsoqSubmissionInput['answers']): number[] {
  return Array.from(new Set(answers.map((item) => item.questionNumber)))
}

async function rollbackSession(sessionId: string): Promise<void> {
  const supabase = getSupabaseAdminClient()
  await supabase.from('copsoq_response_sessions').delete().eq('id', sessionId)
}

export async function processCopsoqIndividualSubmission(
  input: CopsoqSubmissionInput
): Promise<CopsoqSubmissionResult> {
  const questionnaireCode = input.questionnaireCode || DEFAULT_COPSOQ_QUESTIONNAIRE_CODE

  const catalog = await getCatalogByQuestionnaireCode(questionnaireCode)
  if (!catalog) {
    throw new Error('COPSOQ_CATALOG_NOT_FOUND')
  }

  if (catalog.questions.length !== COPSOQ_EXPECTED_SHORT_QUESTION_COUNT) {
    throw new Error('COPSOQ_CATALOG_QUESTION_COUNT_MISMATCH')
  }

  if (input.answers.length !== catalog.questions.length) {
    throw new Error('COPSOQ_INVALID_ANSWER_COUNT')
  }

  const uniqueAnswerNumbers = deduplicateAnswerNumbers(input.answers)
  if (uniqueAnswerNumbers.length !== input.answers.length) {
    throw new Error('COPSOQ_DUPLICATE_ANSWER_NUMBER')
  }

  const catalogNumbers = new Set(catalog.questions.map((question) => question.questionNumber))
  const allAnswersExistInCatalog = input.answers.every((answer) => catalogNumbers.has(answer.questionNumber))

  if (!allAnswersExistInCatalog) {
    throw new Error('COPSOQ_ANSWER_NOT_IN_CATALOG')
  }

  const collaboratorId = await upsertCollaborator({
    companyId: input.companyId,
    externalEmployeeId: input.collaborator.externalEmployeeId,
    fullName: input.collaborator.fullName,
    email: input.collaborator.email,
    setorId: input.collaborator.setorId,
    setorNome: input.collaborator.setorNome,
    gheId: input.collaborator.gheId,
    gheNome: input.collaborator.gheNome,
  })

  const sessionId = await createResponseSession({
    questionnaireVersionId: catalog.versionId,
    collaboratorId,
    companyId: input.companyId,
    periodRef: input.periodRef,
  })

  try {
    const scoring = calculateCopsoqIndividualScores(input.answers, catalog.questions)

    if (scoring.scoredAnswers.length !== catalog.questions.length) {
      throw new Error('COPSOQ_ANSWER_SCORING_INCOMPLETE')
    }

    await insertAnswers(
      scoring.scoredAnswers.map((answer) => ({
        sessionId,
        questionId: answer.questionId,
        rawValue: answer.rawValue,
        score0to100: answer.score0to100,
      }))
    )

    await insertIndividualDimensionScores(sessionId, collaboratorId, input.companyId, scoring.dimensionScores)

    const timestamps = await markResponseSessionProcessed(sessionId)

    return {
      sessionId,
      questionnaireCode: catalog.code,
      submittedAt: timestamps.submittedAt,
      processedAt: timestamps.processedAt,
      dimensions: scoring.dimensionScores,
    }
  } catch (error) {
    await rollbackSession(sessionId)
    throw error
  }
}
