import type { ImportEntityType, ImportPreviewRequest, ImportSourceFormat } from '@/lib/imports/types'

type PreviewValidationSuccess = {
  success: true
  data: ImportPreviewRequest
}

type PreviewValidationFailure = {
  success: false
  errors: string[]
}

export type ImportPreviewValidationResult = PreviewValidationSuccess | PreviewValidationFailure

function isEntityType(value: unknown): value is ImportEntityType {
  return value === 'collaborators' || value === 'sectors' || value === 'ghes'
}

function isSourceFormat(value: unknown): value is ImportSourceFormat {
  return value === 'txt' || value === 'csv' || value === 'xlsx'
}

function asOptionalTrimmed(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseMapping(value: unknown): Record<string, string> | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    const mapping: Record<string, string> = {}

    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v.trim().length > 0) {
        mapping[k] = v.trim()
      }
    }

    return mapping
  } catch {
    return null
  }
}

export function parseImportPreviewInput(input: {
  entityType: unknown
  fileName: unknown
  mimeType: unknown
  sourceFormat: unknown
  requestedCompanyId: unknown
  delimiter: unknown
  sheetName: unknown
  mapping: unknown
}): ImportPreviewValidationResult {
  const errors: string[] = []

  if (!isEntityType(input.entityType)) {
    errors.push('Campo "entityType" invalido.')
  }

  const fileName = asOptionalTrimmed(input.fileName)
  if (!fileName) {
    errors.push('Arquivo obrigatorio para preview.')
  }

  if (!isSourceFormat(input.sourceFormat)) {
    errors.push('Formato de arquivo nao suportado.')
  }

  if (errors.length > 0 || !isEntityType(input.entityType) || !fileName || !isSourceFormat(input.sourceFormat)) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      entityType: input.entityType,
      requestedCompanyId: asOptionalTrimmed(input.requestedCompanyId),
      delimiter: asOptionalTrimmed(input.delimiter),
      sheetName: asOptionalTrimmed(input.sheetName),
      mapping: parseMapping(input.mapping),
      fileName,
      mimeType: asOptionalTrimmed(input.mimeType),
      sourceFormat: input.sourceFormat,
    },
  }
}
