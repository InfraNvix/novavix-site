export type ImportEntityType = 'collaborators' | 'sectors' | 'ghes'

export type ImportSourceFormat = 'txt' | 'csv' | 'xlsx'

export type ImportJobStatus = 'preview_ready' | 'committed' | 'failed'

export type ImportActorMode = 'user' | 'api_key' | 'system'

export type ImportFieldSpec = {
  key: string
  label: string
  required: boolean
  aliases?: string[]
}

export type ImportLayoutProfile = {
  entityType: ImportEntityType
  key: string
  displayName: string
  fields: ImportFieldSpec[]
  supportedFormats: ImportSourceFormat[]
}

export type ImportColumnMapping = Record<string, string>

export type ImportValidationIssue = {
  rowNumber: number
  columnKey: string | null
  code: string
  message: string
}

export type ImportPreviewRequest = {
  entityType: ImportEntityType
  requestedCompanyId?: string | null
  delimiter?: string | null
  sheetName?: string | null
  mapping?: ImportColumnMapping | null
  fileName: string
  mimeType: string | null
  sourceFormat: ImportSourceFormat
}

export type ImportParserOptions = {
  delimiter?: string | null
  sheetName?: string | null
}

export type ImportPreviewResponse = {
  importJobId: string
  entityType: ImportEntityType
  companyId: string
  status: ImportJobStatus
  layoutKey: string
  detectedColumns: string[]
  suggestedMapping: ImportColumnMapping
  previewRows: Record<string, string | number | null>[]
  validationSummary: {
    totalRows: number
    validRows: number
    invalidRows: number
    duplicateInFile: number
    duplicateInDatabase: number
  }
  issues: ImportValidationIssue[]
}

export type ImportCommitRequest = {
  importJobId: string
  mapping?: ImportColumnMapping | null
  conflictStrategy: 'skip' | 'upsert' | 'error'
}

export type ImportCommitResponse = {
  importJobId: string
  status: ImportJobStatus
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    importedRows: number
    ignoredRows: number
  }
  issuesSample: ImportValidationIssue[]
}

export type ImportTableData = {
  columns: string[]
  rows: Record<string, string | number | null>[]
  meta: {
    sourceFormat: ImportSourceFormat
    totalRowsRead: number
    emptyRowsSkipped: number
    invalidRowsSkipped: number
    warnings: string[]
  }
}
