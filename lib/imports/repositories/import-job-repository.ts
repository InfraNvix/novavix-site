import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { ImportActorMode, ImportCommitResponse, ImportEntityType, ImportJobStatus } from '@/lib/imports/types'

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
  mapping?: Record<string, string> | null
}

export async function markImportJobAsCommitted(input: CommitJobInput): Promise<ImportCommitResponse> {
  const supabase = getSupabaseAdminClient()

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('import_jobs')
    .update({
      status: 'committed',
      committed_at: nowIso,
      mapping: input.mapping ?? null,
      commit_summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        importedRows: 0,
        ignoredRows: 0,
      },
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
    summary: {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      importedRows: 0,
      ignoredRows: 0,
    },
    issuesSample: [],
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

