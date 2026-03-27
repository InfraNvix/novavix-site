import type { ImportEntityType, ImportPreviewResponse } from '@/lib/imports/types'
import { getImportLayoutProfile } from '@/lib/imports/layouts'
import { parseImportBuffer } from '@/lib/imports/parsers'
import { createImportPreviewJob, updateImportJobPreviewPayload } from '@/lib/imports/repositories/import-job-repository'

type ProcessImportPreviewInput = {
  entityType: ImportEntityType
  companyId: string
  actorMode: 'user' | 'api_key' | 'system'
  actorUserId?: string | null
  fileName: string
  mimeType: string | null
  sourceFormat: 'txt' | 'csv' | 'xlsx'
  delimiter?: string | null
  sheetName?: string | null
  mapping?: Record<string, string> | null
  fileBuffer: Buffer
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function detectSuggestedMapping(
  columns: string[],
  explicitMapping: Record<string, string> | null | undefined,
  layout: ReturnType<typeof getImportLayoutProfile>
): Record<string, string> {
  const mapping: Record<string, string> = { ...(explicitMapping ?? {}) }
  const columnsByNormalized = new Map<string, string>()

  for (const column of columns) {
    columnsByNormalized.set(normalizeToken(column), column)
  }

  for (const field of layout.fields) {
    if (mapping[field.key]) {
      continue
    }

    const candidates = [field.key, ...(field.aliases ?? [])].map((value) => normalizeToken(value))
    const matched = candidates.find((candidate) => columnsByNormalized.has(candidate))
    if (matched) {
      mapping[field.key] = columnsByNormalized.get(matched) as string
    }
  }

  return mapping
}

export async function processImportPreview(input: ProcessImportPreviewInput): Promise<ImportPreviewResponse> {
  if (input.entityType !== 'collaborators') {
    throw new Error('IMPORT_ENTITY_NOT_ENABLED')
  }

  const layout = getImportLayoutProfile(input.entityType)
  const table = await parseImportBuffer(input.sourceFormat, input.fileBuffer, {
    delimiter: input.delimiter ?? null,
    sheetName: input.sheetName ?? null,
  })

  const suggestedMapping = detectSuggestedMapping(table.columns, input.mapping, layout)
  const requiredFields = layout.fields.filter((item) => item.required)
  const missingRequiredFields = requiredFields.filter((field) => {
    const mappedColumn = suggestedMapping[field.key]
    return !mappedColumn || !table.columns.includes(mappedColumn)
  })

  const requiredIssues = missingRequiredFields.map((field) => ({
    rowNumber: 0,
    columnKey: field.key,
    code: 'IMPORT_REQUIRED_FIELD_UNMAPPED',
    message: `Campo obrigatorio sem mapeamento: ${field.label}.`,
  }))

  const invalidRows = missingRequiredFields.length > 0 ? table.rows.length : 0
  const validRows = missingRequiredFields.length > 0 ? 0 : table.rows.length
  const issues = [
    ...table.meta.warnings.map((warning) => ({
      rowNumber: 0,
      columnKey: null,
      code: 'IMPORT_PARSE_WARNING',
      message: warning,
    })),
    ...requiredIssues,
  ]

  const job = await createImportPreviewJob({
    entityType: input.entityType,
    companyId: input.companyId,
    actorMode: input.actorMode,
    actorUserId: input.actorUserId ?? null,
    sourceFileName: input.fileName,
    sourceMimeType: input.mimeType,
    sourceFormat: input.sourceFormat,
    layoutKey: layout.key,
    delimiter: input.delimiter ?? null,
    sheetName: input.sheetName ?? null,
    mapping: suggestedMapping,
  })

  await updateImportJobPreviewPayload({
    importJobId: job.id,
    mapping: suggestedMapping,
    table,
    summary: {
      totalRows: table.rows.length,
      validRows,
      invalidRows,
      duplicateInFile: 0,
      duplicateInDatabase: 0,
    },
    issues,
  })

  return {
    importJobId: job.id,
    entityType: input.entityType,
    companyId: input.companyId,
    status: job.status,
    layoutKey: layout.key,
    detectedColumns: table.columns,
    suggestedMapping,
    previewRows: table.rows.slice(0, 20),
    validationSummary: {
      totalRows: table.rows.length,
      validRows,
      invalidRows,
      duplicateInFile: 0,
      duplicateInDatabase: 0,
    },
    issues,
  }
}

