import type { ImportCommitRequest } from '@/lib/imports/types'

type CommitValidationSuccess = {
  success: true
  data: ImportCommitRequest
}

type CommitValidationFailure = {
  success: false
  errors: string[]
}

export type ImportCommitValidationResult = CommitValidationSuccess | CommitValidationFailure

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isConflictStrategy(value: unknown): value is ImportCommitRequest['conflictStrategy'] {
  return value === 'skip' || value === 'upsert' || value === 'error'
}

function parseMapping(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const mappingRecord = value as Record<string, unknown>
  const mapping: Record<string, string> = {}

  for (const [k, v] of Object.entries(mappingRecord)) {
    if (typeof v === 'string' && v.trim().length > 0) {
      mapping[k] = v.trim()
    }
  }

  return mapping
}

export function parseImportCommitPayload(input: unknown): ImportCommitValidationResult {
  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Payload deve ser um objeto JSON valido.'] }
  }

  const payload = input as Record<string, unknown>
  const errors: string[] = []

  const importJobId = asTrimmedString(payload.importJobId)
  if (!importJobId) {
    errors.push('Campo "importJobId" e obrigatorio.')
  }

  if (!isConflictStrategy(payload.conflictStrategy)) {
    errors.push('Campo "conflictStrategy" invalido.')
  }

  if (errors.length > 0 || !importJobId || !isConflictStrategy(payload.conflictStrategy)) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      importJobId,
      conflictStrategy: payload.conflictStrategy,
      mapping: parseMapping(payload.mapping),
    },
  }
}
