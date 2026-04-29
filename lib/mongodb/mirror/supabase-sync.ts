import type { Db } from 'mongodb'
import { getMongoDb } from '@/lib/mongodb/client'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export type SyncEntity =
  | 'companies'
  | 'user_profiles'
  | 'company_form_templates'
  | 'company_form_submissions'
  | 'form_email_invites'

export type SyncCount = Record<SyncEntity, number>

const SUPABASE_PAGE_SIZE = 1000
const REDACTED = '[REDACTED]'

export class SyncStepError extends Error {
  table: SyncEntity
  operation: string
  detail: string
  partialSynced: SyncCount

  constructor(params: {
    table: SyncEntity
    operation: string
    detail: string
    partialSynced: SyncCount
  }) {
    super(`Falha ao sincronizar ${params.table}`)
    this.name = 'SyncStepError'
    this.table = params.table
    this.operation = params.operation
    this.detail = params.detail
    this.partialSynced = params.partialSynced
  }
}

type CompanyRow = {
  id: string
  cnpj: string
  razao_social: string
  nome_fantasia: string | null
  status: string
  created_at: string
  updated_at: string
}

type UserProfileRow = {
  user_id: string
  role: string
  company_id: string | null
  login_email: string
  is_active: boolean
  created_at: string
  updated_at: string
}

type CompanyFormTemplateRow = {
  id: string
  company_id: string
  template_name: string
  source_format: string
  source_file_name: string
  schema_json: unknown
  status: string
  uploaded_by_user_id: string | null
  created_at: string
  updated_at: string
}

type CompanyFormSubmissionRow = {
  id: string
  template_id: string
  company_id: string | null
  respondent_name: string | null
  respondent_email: string | null
  answers_json: unknown
  invite_id: string | null
  created_at: string
}

type FormEmailInviteRow = {
  id: string
  template_id: string
  recipient_email: string
  token_hash: string
  status: string
  expires_at: string
  used_at: string | null
  sent_at: string | null
  last_error: string | null
  created_at: string
  created_by: string | null
}

function initialSyncCount(): SyncCount {
  return {
    companies: 0,
    user_profiles: 0,
    company_form_templates: 0,
    company_form_submissions: 0,
    form_email_invites: 0,
  }
}

function sanitizeErrorDetail(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Erro interno durante sincronizacao.'

  const sanitized = raw
    .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, REDACTED)
    .replace(/(SUPABASE_SERVICE_ROLE_KEY|MONGODB_URI|password|passwd|token|secret)\s*[:=]\s*[^\s,;]+/gi, `$1=${REDACTED}`)

  return sanitized.slice(0, 500)
}

function logStepError(table: SyncEntity, operation: string, error: unknown): void {
  const message = sanitizeErrorDetail(error)
  console.error('[supabase-to-mongo sync] step failed', {
    table,
    operation,
    message,
    rawError: error,
  })
}

async function fetchAll<T extends Record<string, unknown>>(table: string, columns: string): Promise<T[]> {
  const supabase = getSupabaseAdminClient()
  const rows: T[] = []
  let from = 0

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1
    const { data, error } = await supabase.from(table).select(columns).range(from, to)
    if (error) {
      throw new Error(`SUPABASE_FETCH_FAILED:${table}:${error.message}`)
    }

    const batch = (data ?? []) as unknown as T[]
    rows.push(...batch)

    if (batch.length < SUPABASE_PAGE_SIZE) {
      break
    }

    from += SUPABASE_PAGE_SIZE
  }

  return rows
}

async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection('companies').createIndex({ supabase_id: 1 }, { unique: true }),
    db.collection('user_profiles').createIndex({ supabase_id: 1 }, { unique: true }),
    db.collection('company_form_templates').createIndex({ supabase_id: 1 }, { unique: true }),
    db.collection('company_form_submissions').createIndex({ supabase_id: 1 }, { unique: true }),
    db.collection('form_email_invites').createIndex({ supabase_id: 1 }, { unique: true }),
  ])
}

export async function upsertCompanies(db: Db, rows: CompanyRow[]): Promise<number> {
  if (rows.length === 0) return 0

  const ops = rows.map((row) => ({
    updateOne: {
      filter: { supabase_id: row.id },
      update: {
        $set: {
          supabase_id: row.id,
          cnpj: row.cnpj,
          razao_social: row.razao_social,
          nome_fantasia: row.nome_fantasia,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          mirrored_at: new Date().toISOString(),
        },
      },
      upsert: true,
    },
  }))

  await db.collection('companies').bulkWrite(ops, { ordered: false })
  return rows.length
}

export async function upsertUserProfiles(db: Db, rows: UserProfileRow[]): Promise<number> {
  if (rows.length === 0) return 0

  const ops = rows.map((row) => ({
    updateOne: {
      filter: { supabase_id: row.user_id },
      update: {
        $set: {
          supabase_id: row.user_id,
          role: row.role,
          company_id: row.company_id,
          login_email: row.login_email,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at,
          mirrored_at: new Date().toISOString(),
        },
      },
      upsert: true,
    },
  }))

  await db.collection('user_profiles').bulkWrite(ops, { ordered: false })
  return rows.length
}

export async function upsertCompanyFormTemplates(db: Db, rows: CompanyFormTemplateRow[]): Promise<number> {
  if (rows.length === 0) return 0

  const ops = rows.map((row) => ({
    updateOne: {
      filter: { supabase_id: row.id },
      update: {
        $set: {
          supabase_id: row.id,
          company_id: row.company_id,
          template_name: row.template_name,
          source_format: row.source_format,
          source_file_name: row.source_file_name,
          schema_json: row.schema_json,
          status: row.status,
          uploaded_by_user_id: row.uploaded_by_user_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          mirrored_at: new Date().toISOString(),
        },
      },
      upsert: true,
    },
  }))

  await db.collection('company_form_templates').bulkWrite(ops, { ordered: false })
  return rows.length
}

export async function upsertCompanyFormSubmissions(db: Db, rows: CompanyFormSubmissionRow[]): Promise<number> {
  if (rows.length === 0) return 0

  const ops = rows.map((row) => ({
    updateOne: {
      filter: { supabase_id: row.id },
      update: {
        $set: {
          supabase_id: row.id,
          template_id: row.template_id,
          company_id: row.company_id,
          respondent_name: row.respondent_name,
          respondent_email: row.respondent_email,
          answers_json: row.answers_json,
          invite_id: row.invite_id,
          created_at: row.created_at,
          mirrored_at: new Date().toISOString(),
        },
      },
      upsert: true,
    },
  }))

  await db.collection('company_form_submissions').bulkWrite(ops, { ordered: false })
  return rows.length
}

export async function upsertFormEmailInvites(db: Db, rows: FormEmailInviteRow[]): Promise<number> {
  if (rows.length === 0) return 0

  const ops = rows.map((row) => ({
    updateOne: {
      filter: { supabase_id: row.id },
      update: {
        $set: {
          supabase_id: row.id,
          template_id: row.template_id,
          recipient_email: row.recipient_email,
          token_hash: row.token_hash,
          status: row.status,
          expires_at: row.expires_at,
          used_at: row.used_at,
          sent_at: row.sent_at,
          last_error: row.last_error,
          created_at: row.created_at,
          created_by: row.created_by,
          mirrored_at: new Date().toISOString(),
        },
      },
      upsert: true,
    },
  }))

  await db.collection('form_email_invites').bulkWrite(ops, { ordered: false })
  return rows.length
}

async function syncStep<T extends Record<string, unknown>>(params: {
  db: Db
  table: SyncEntity
  columns: string
  fetchTableName: string
  upsert: (db: Db, rows: T[]) => Promise<number>
  synced: SyncCount
}): Promise<void> {
  const { db, table, columns, fetchTableName, upsert, synced } = params

  try {
    const rows = await fetchAll<T>(fetchTableName, columns)

    try {
      synced[table] = await upsert(db, rows)
    } catch (error) {
      logStepError(table, 'mongo_upsert', error)
      throw new SyncStepError({
        table,
        operation: 'mongo_upsert',
        detail: sanitizeErrorDetail(error),
        partialSynced: { ...synced },
      })
    }
  } catch (error) {
    if (error instanceof SyncStepError) {
      throw error
    }

    logStepError(table, 'supabase_fetch', error)
    throw new SyncStepError({
      table,
      operation: 'supabase_fetch',
      detail: sanitizeErrorDetail(error),
      partialSynced: { ...synced },
    })
  }
}

export async function syncSupabaseToMongo(): Promise<{ synced: SyncCount }> {
  const db = await getMongoDb()
  await ensureIndexes(db)

  const synced = initialSyncCount()

  await syncStep<CompanyRow>({
    db,
    table: 'companies',
    fetchTableName: 'companies',
    columns: 'id, cnpj, razao_social, nome_fantasia, status, created_at, updated_at',
    upsert: upsertCompanies,
    synced,
  })

  await syncStep<UserProfileRow>({
    db,
    table: 'user_profiles',
    fetchTableName: 'user_profiles',
    columns: 'user_id, role, company_id, login_email, is_active, created_at, updated_at',
    upsert: upsertUserProfiles,
    synced,
  })

  await syncStep<CompanyFormTemplateRow>({
    db,
    table: 'company_form_templates',
    fetchTableName: 'company_form_templates',
    columns:
      'id, company_id, template_name, source_format, source_file_name, schema_json, status, uploaded_by_user_id, created_at, updated_at',
    upsert: upsertCompanyFormTemplates,
    synced,
  })

  await syncStep<CompanyFormSubmissionRow>({
    db,
    table: 'company_form_submissions',
    fetchTableName: 'company_form_submissions',
    columns: 'id, template_id, company_id, respondent_name, respondent_email, answers_json, invite_id, created_at',
    upsert: upsertCompanyFormSubmissions,
    synced,
  })

  await syncStep<FormEmailInviteRow>({
    db,
    table: 'form_email_invites',
    fetchTableName: 'form_email_invites',
    columns:
      'id, template_id, recipient_email, token_hash, status, expires_at, used_at, sent_at, last_error, created_at, created_by',
    upsert: upsertFormEmailInvites,
    synced,
  })

  return { synced }
}
