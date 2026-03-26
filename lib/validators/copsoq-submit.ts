import {
  COPSOQ_EXPECTED_SHORT_QUESTION_COUNT,
  DEFAULT_COPSOQ_QUESTIONNAIRE_CODE,
} from '@/lib/copsoq/config/constants'
import { isValidCopsoqAnswerValue } from '@/lib/copsoq/scoring/scale'
import type { CopsoqSubmissionInput } from '@/lib/copsoq/types'

type CopsoqSubmissionValidationSuccess = {
  success: true
  data: CopsoqSubmissionInput
}

type CopsoqSubmissionValidationFailure = {
  success: false
  errors: string[]
}

export type CopsoqSubmissionValidationResult =
  | CopsoqSubmissionValidationSuccess
  | CopsoqSubmissionValidationFailure

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asOptionalTrimmedString(value: unknown): string | null {
  const normalized = asTrimmedString(value)
  return normalized ?? null
}

export function parseCopsoqSubmissionPayload(input: unknown): CopsoqSubmissionValidationResult {
  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Payload deve ser um objeto JSON valido.'] }
  }

  const payload = input as Record<string, unknown>
  const errors: string[] = []

  const companyId = asTrimmedString(payload.companyId)
  const questionnaireCode = asOptionalTrimmedString(payload.questionnaireCode) ?? DEFAULT_COPSOQ_QUESTIONNAIRE_CODE
  const periodRef = asOptionalTrimmedString(payload.periodRef)

  if (!companyId) {
    errors.push('Campo "companyId" e obrigatorio.')
  }

  if (!questionnaireCode) {
    errors.push('Campo "questionnaireCode" invalido.')
  }

  const collaboratorRaw = payload.collaborator
  if (!collaboratorRaw || typeof collaboratorRaw !== 'object') {
    errors.push('Campo "collaborator" e obrigatorio.')
  }

  const collaborator = (collaboratorRaw ?? {}) as Record<string, unknown>
  const externalEmployeeId = asTrimmedString(collaborator.externalEmployeeId)
  if (!externalEmployeeId) {
    errors.push('Campo "collaborator.externalEmployeeId" e obrigatorio.')
  }

  const answersRaw = payload.answers
  if (!Array.isArray(answersRaw)) {
    errors.push('Campo "answers" deve ser uma lista de respostas.')
  }

  const normalizedAnswers = (Array.isArray(answersRaw) ? answersRaw : [])
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Resposta ${index + 1}: formato invalido.`)
        return null
      }

      const row = item as Record<string, unknown>
      const questionNumber = Number(row.questionNumber)
      const value = Number(row.value)

      if (!Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > COPSOQ_EXPECTED_SHORT_QUESTION_COUNT) {
        errors.push(`Resposta ${index + 1}: "questionNumber" invalido.`)
      }

      if (!Number.isInteger(value) || !isValidCopsoqAnswerValue(value)) {
        errors.push(`Resposta ${index + 1}: "value" deve estar entre 1 e 5.`)
      }

      return {
        questionNumber,
        value,
      }
    })
    .filter((item): item is { questionNumber: number; value: number } => Boolean(item))

  if (normalizedAnswers.length !== COPSOQ_EXPECTED_SHORT_QUESTION_COUNT) {
    errors.push(`O questionario deve conter exatamente ${COPSOQ_EXPECTED_SHORT_QUESTION_COUNT} respostas.`)
  }

  if (errors.length > 0 || !companyId || !externalEmployeeId) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      questionnaireCode,
      companyId,
      periodRef,
      collaborator: {
        externalEmployeeId,
        fullName: asOptionalTrimmedString(collaborator.fullName),
        email: asOptionalTrimmedString(collaborator.email),
        setorId: asOptionalTrimmedString(collaborator.setorId),
        setorNome: asOptionalTrimmedString(collaborator.setorNome),
        gheId: asOptionalTrimmedString(collaborator.gheId),
        gheNome: asOptionalTrimmedString(collaborator.gheNome),
      },
      answers: normalizedAnswers,
    },
  }
}
