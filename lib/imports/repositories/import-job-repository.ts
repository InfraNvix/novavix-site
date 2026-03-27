import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type {
  ImportActorMode,
  ImportColumnMapping,
  ImportCommitResponse,
  ImportEntityType,
  ImportJobStatus,
  ImportTableData,
  ImportValidationIssue,
} from '@/lib/imports/types'

type CreateImportPreviewJobInput = {
  entityType: ImportEntityType
  companyId: string
  actorMode: ImportActorMode
  actorUserId?: string | null
  sourceFileName: string
  sourceMimeType?: string | null
  sourceFormat: 'txt' | 'csv' | 'xlsx'
  layoutKey: string
  delimiter?: string | null
  sheetName?: string | null
  mapping?: Record<string, string> | null
}

export async function createImportPreviewJob(input: CreateImportPreviewJobInput): Promise<{ id: string; status: ImportJobStatus }> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('import_jobs')
    .insert({
      entity_type: input.entityType,
      status: 'preview_ready',
      company_id: input.companyId,
      created_by_user_id: input.actorUserId ?? null,
      actor_mode: input.actorMode,
      source_filename: input.sourceFileName,
      source_mime_type: input.sourceMimeType ?? null,
      source_format: input.sourceFormat,
      layout_key: input.layoutKey,
      delimiter: input.delimiter ?? null,
      sheet_name: input.sheetName ?? null,
      mapping: input.mapping ?? null,
      total_rows: 0,
      valid_rows: 0,
      invalid_rows: 0,
      imported_rows: 0,
      ignored_rows: 0,
      error_count: 0,
    })
    .select('id, status')
    .single()

  if (error || !data) {
    throw new Error('IMPORT_PREVIEW_JOB_CREATE_FAILED')
  }

  return {
    id: data.id as string,
    status: data.status as ImportJobStatus,
  }
}

type CommitJobInput = {
  importJobId: string
  mapping?: ImportColumnMapping | null
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    importedRows: number
    ignoredRows: number
  }
  issuesSample: ImportValidationIssue[]
  status?: ImportJobStatus
}

export async function markImportJobAsCommitted(input: CommitJobInput): Promise<ImportCommitResponse> {
  const supabase = getSupabaseAdminClient()

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('import_jobs')
    .update({
      status: input.status ?? 'committed',
      committed_at: nowIso,
      mapping: input.mapping ?? null,
      commit_summary: {
        ...input.summary,
        issuesSample: input.issuesSample,
      },
      total_rows: input.summary.totalRows,
      valid_rows: input.summary.validRows,
      invalid_rows: input.summary.invalidRows,
      imported_rows: input.summary.importedRows,
      ignored_rows: input.summary.ignoredRows,
      error_count: input.summary.invalidRows,
      updated_at: nowIso,
    })
    .eq('id', input.importJobId)
    .select('id, status')
    .maybeSingle()

  if (error || !data) {
    throw new Error('IMPORT_COMMIT_JOB_UPDATE_FAILED')
  }

  return {
    importJobId: data.id as string,
    status: data.status as ImportJobStatus,
    summary: input.summary,
    issuesSample: input.issuesSample,
  }
}

export async function getImportJobById(importJobId: string): Promise<{ id: string; companyId: string; entityType: ImportEntityType } | null> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('import_jobs')
    .select('id, company_id, entity_type')
    .eq('id', importJobId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    id: data.id as string,
    companyId: data.company_id as string,
    entityType: data.entity_type as ImportEntityType,
  }
}

type UpdatePreviewPayloadInput = {
  importJobId: string
  mapping: ImportColumnMapping
  table: ImportTableData
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    duplicateInFile: number
    duplicateInDatabase: number
  }
  issues: ImportValidationIssue[]
}

export async function updateImportJobPreviewPayload(input: UpdatePreviewPayloadInput): Promise<void> {
  const supabase = getSupabaseAdminClient()
  const nowIso = new Date().toISOString()

  const { error } = await supabase
    .from('import_jobs')
    .update({
      mapping: input.mapping,
      validation_summary: {
        summary: input.summary,
        issues: input.issues,
        table: input.table,
      },
      total_rows: input.summary.totalRows,
      valid_rows: input.summary.validRows,
      invalid_rows: input.summary.invalidRows,
      error_count: input.summary.invalidRows,
      updated_at: nowIso,
    })
    .eq('id', input.importJobId)

  if (error) {
    throw new Error('IMPORT_PREVIEW_JOB_UPDATE_FAILED')
  }
}

export type ImportJobCommitPayload = {
  id: string
  companyId: string
  entityType: ImportEntityType
  mapping: ImportColumnMapping | null
  validationSummary: {
    table: ImportTableData
  } | null
}

export async function getImportJobCommitPayload(importJobId: string): Promise<ImportJobCommitPayload | null> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('import_jobs')
    .select('id, company_id, entity_type, mapping, validation_summary')
    .eq('id', importJobId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    id: data.id as string,
    companyId: data.company_id as string,
    entityType: data.entity_type as ImportEntityType,
    mapping: (data.mapping as ImportColumnMapping | null) ?? null,
    validationSummary: (data.validation_summary as { table: ImportTableData } | null) ?? null,
  }
}

