import type { Db } from 'mongodb'
import { getMongoDb } from '@/lib/mongodb/client'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

type SyncEntity =
  | 'companies'
  | 'user_profiles'
  | 'company_form_templates'
  | 'company_form_submissions'
  | 'form_email_invites'

type SyncCount = Record<SyncEntity, number>

const SUPABASE_PAGE_SIZE = 1000

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
  status: string
  expires_at: string
  used_at: string | null
  sent_at: string | null
  last_error: string | null
  created_at: string
  created_by: string | null
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

export async function syncSupabaseToMongo(): Promise<{ synced: SyncCount }> {
  const db = await getMongoDb()
  await ensureIndexes(db)

  const [companies, userProfiles, formTemplates, formSubmissions, formInvites] = await Promise.all([
    fetchAll<CompanyRow>('companies', 'id, cnpj, razao_social, nome_fantasia, status, created_at, updated_at'),
    fetchAll<UserProfileRow>('user_profiles', 'user_id, role, company_id, login_email, is_active, created_at, updated_at'),
    fetchAll<CompanyFormTemplateRow>(
      'company_form_templates',
      'id, company_id, template_name, source_format, source_file_name, schema_json, status, uploaded_by_user_id, created_at, updated_at'
    ),
    fetchAll<CompanyFormSubmissionRow>(
      'company_form_submissions',
      'id, template_id, company_id, respondent_name, respondent_email, answers_json, invite_id, created_at'
    ),
    fetchAll<FormEmailInviteRow>(
      'form_email_invites',
      'id, template_id, recipient_email, status, expires_at, used_at, sent_at, last_error, created_at, created_by'
    ),
  ])

  const [companiesCount, userProfilesCount, templatesCount, submissionsCount, invitesCount] = await Promise.all([
    upsertCompanies(db, companies),
    upsertUserProfiles(db, userProfiles),
    upsertCompanyFormTemplates(db, formTemplates),
    upsertCompanyFormSubmissions(db, formSubmissions),
    upsertFormEmailInvites(db, formInvites),
  ])

  return {
    synced: {
      companies: companiesCount,
      user_profiles: userProfilesCount,
      company_form_templates: templatesCount,
      company_form_submissions: submissionsCount,
      form_email_invites: invitesCount,
    },
  }
}
