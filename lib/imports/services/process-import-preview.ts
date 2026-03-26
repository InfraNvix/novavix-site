import type { ImportEntityType, ImportPreviewResponse } from '@/lib/imports/types'
import { getImportLayoutProfile } from '@/lib/imports/layouts'
import { parseImportBuffer } from '@/lib/imports/parsers'
import { createImportPreviewJob } from '@/lib/imports/repositories/import-job-repository'

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

export async function processImportPreview(input: ProcessImportPreviewInput): Promise<ImportPreviewResponse> {
  if (input.entityType !== 'collaborators') {
    throw new Error('IMPORT_ENTITY_NOT_ENABLED')
  }

  const layout = getImportLayoutProfile(input.entityType)
  const table = await parseImportBuffer(input.sourceFormat, input.fileBuffer, {
    delimiter: input.delimiter ?? null,
    sheetName: input.sheetName ?? null,
  })

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
    mapping: input.mapping ?? null,
  })

  return {
    importJobId: job.id,
    entityType: input.entityType,
    companyId: input.companyId,
    status: job.status,
    layoutKey: layout.key,
    detectedColumns: table.columns,
    suggestedMapping: input.mapping ?? {},
    previewRows: table.rows.slice(0, 20),
    validationSummary: {
      totalRows: table.rows.length,
      validRows: table.rows.length,
      invalidRows: 0,
      duplicateInFile: 0,
      duplicateInDatabase: 0,
    },
    issues: table.meta.warnings.map((warning) => ({
      rowNumber: 0,
      columnKey: null,
      code: 'IMPORT_PARSE_WARNING',
      message: warning,
    })),
  }
}

