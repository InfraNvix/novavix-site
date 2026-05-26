import { getMongoDb } from '@/lib/mongodb/client'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { upsertCompanies, upsertCompanyFormSubmissions, upsertCompanyFormTemplates, upsertFormEmailInvites, upsertUserProfiles } from '@/lib/mongodb/mirror/supabase-sync'

type ProfileRow = {
  user_id: string
  role: string
  company_id: string | null
  login_email: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getProfileMongoFirst(userId: string): Promise<{ role: string; is_active: boolean } | null> {
  const db = await getMongoDb()
  const fromMongo = await db
    .collection<ProfileRow>('user_profiles')
    .findOne({ $or: [{ supabase_id: userId }, { user_id: userId }] } as never, {
      projection: { role: 1, is_active: 1 },
    })

  if (fromMongo?.role) {
    return { role: fromMongo.role, is_active: Boolean(fromMongo.is_active) }
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, role, company_id, login_email, is_active, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data?.user_id) return null

  try {
    await upsertUserProfiles(db, [data])
  } catch (mirrorError) {
    console.error('[profile mongo-first] failed to cache profile from Supabase', {
      userId,
      message: mirrorError instanceof Error ? mirrorError.message : 'UNKNOWN_ERROR',
      rawError: mirrorError,
    })
  }

  return { role: data.role, is_active: Boolean(data.is_active) }
}

export async function listCompaniesMongo(limit = 200): Promise<Array<{ id: string; cnpj: string; razao_social: string; nome_fantasia: string | null; status: string; created_at: string | null }>> {
  const db = await getMongoDb()
  const docs = await db
    .collection('companies')
    .find({}, { projection: { supabase_id: 1, cnpj: 1, razao_social: 1, nome_fantasia: 1, status: 1, created_at: 1 } })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray()

  return docs.map((doc) => ({
    id: String(doc.supabase_id ?? doc.id ?? ''),
    cnpj: String(doc.cnpj ?? ''),
    razao_social: String(doc.razao_social ?? ''),
    nome_fantasia: (doc.nome_fantasia as string | null | undefined) ?? null,
    status: String(doc.status ?? 'active'),
    created_at: (doc.created_at as string | null | undefined) ?? null,
  }))
}

export async function findCompanyByCnpjMongo(cnpj: string): Promise<{ id: string; cnpj: string; status: string } | null> {
  const db = await getMongoDb()
  const doc = await db.collection('companies').findOne({ cnpj }, { projection: { supabase_id: 1, cnpj: 1, status: 1 } })
  if (!doc) return null
  return {
    id: String(doc.supabase_id ?? doc.id ?? ''),
    cnpj: String(doc.cnpj ?? ''),
    status: String(doc.status ?? 'active'),
  }
}

export async function insertCompanyMongo(input: { id: string; cnpj: string; razao_social: string; nome_fantasia: string | null; status: string }): Promise<void> {
  const db = await getMongoDb()
  await upsertCompanies(db, [
    {
      id: input.id,
      cnpj: input.cnpj,
      razao_social: input.razao_social,
      nome_fantasia: input.nome_fantasia,
      status: input.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ])
}

export async function insertUserProfileMongo(input: { user_id: string; role: string; company_id: string | null; login_email: string; is_active: boolean }): Promise<void> {
  const db = await getMongoDb()
  await upsertUserProfiles(db, [
    {
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ])
}

export async function listTemplatesMongo(companyId?: string): Promise<Array<{ id: string; company_id: string | null; template_name: string; source_format: string; source_file_name: string; status: string; created_at: string | null }>> {
  const db = await getMongoDb()
  const filter = companyId ? { company_id: companyId } : {}
  const docs = await db
    .collection('company_form_templates')
    .find(filter, { projection: { supabase_id: 1, company_id: 1, template_name: 1, source_format: 1, source_file_name: 1, status: 1, created_at: 1 } })
    .sort({ created_at: -1 })
    .limit(200)
    .toArray()

  return docs.map((doc) => ({
    id: String(doc.supabase_id ?? doc.id ?? ''),
    company_id: (doc.company_id as string | null | undefined) ?? null,
    template_name: String(doc.template_name ?? ''),
    source_format: String(doc.source_format ?? ''),
    source_file_name: String(doc.source_file_name ?? ''),
    status: String(doc.status ?? 'active'),
    created_at: (doc.created_at as string | null | undefined) ?? null,
  }))
}

export async function insertTemplateMongo(input: {
  id: string
  company_id: string | null
  template_name: string
  source_format: string
  source_file_name: string
  schema_json: unknown
  status: string
  uploaded_by_user_id: string
}): Promise<void> {
  const db = await getMongoDb()
  await upsertCompanyFormTemplates(db, [
    {
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ])
}

export async function findTemplateActiveByIdMongo(
  templateId: string
): Promise<{ id: string; company_id: string | null; template_name: string; status: string; schema_json?: unknown } | null> {
  const db = await getMongoDb()
  const doc = await db.collection('company_form_templates').findOne(
    { supabase_id: templateId, status: 'active' },
    { projection: { supabase_id: 1, company_id: 1, template_name: 1, status: 1, schema_json: 1 } }
  )
  if (!doc) return null
  return {
    id: String(doc.supabase_id ?? ''),
    company_id: (doc.company_id as string | null | undefined) ?? null,
    template_name: String(doc.template_name ?? ''),
    status: String(doc.status ?? 'active'),
    schema_json: doc.schema_json,
  }
}

export async function insertInviteMongo(input: {
  id: string
  template_id: string
  recipient_email: string
  token_hash: string
  status: string
  expires_at: string
  created_by: string | null
  sent_at: string | null
  last_error: string | null
  company_id?: string | null
  collaborator_id?: string | null
  collaborator_external_employee_id?: string | null
  collaborator_name?: string | null
}): Promise<void> {
  const db = await getMongoDb()
  await upsertFormEmailInvites(db, [
    {
      ...input,
      used_at: null,
      created_at: new Date().toISOString(),
    },
  ])
}

export async function findRecentPendingInviteMongo(templateId: string, recipientEmail: string, thresholdIso: string): Promise<{ id: string } | null> {
  const db = await getMongoDb()
  const doc = await db.collection('form_email_invites').findOne({
    template_id: templateId,
    recipient_email: recipientEmail,
    status: 'pending',
    sent_at: { $type: 'string' },
    created_at: { $gte: thresholdIso },
  }, { projection: { supabase_id: 1 } })

  if (!doc?.supabase_id) return null
  return { id: String(doc.supabase_id) }
}

export async function updateInviteMongoById(inviteId: string, patch: Record<string, unknown>): Promise<void> {
  const db = await getMongoDb()
  await db.collection('form_email_invites').updateOne(
    { supabase_id: inviteId },
    {
      $set: {
        ...patch,
        mirrored_at: new Date().toISOString(),
      },
    }
  )
}

export async function consumePendingInviteMongoById(inviteId: string, usedAtIso: string): Promise<boolean> {
  const db = await getMongoDb()
  const result = await db.collection('form_email_invites').updateOne(
    {
      supabase_id: inviteId,
      status: 'pending',
      used_at: null,
    },
    {
      $set: {
        status: 'used',
        used_at: usedAtIso,
        mirrored_at: new Date().toISOString(),
      },
    }
  )

  return result.modifiedCount === 1
}

export async function findInviteByTokenHashMongo(tokenHash: string): Promise<{
  id: string
  template_id: string
  status: string
  expires_at: string
  used_at: string | null
  recipient_email: string | null
  company_id: string | null
  collaborator_id: string | null
  collaborator_external_employee_id: string | null
  collaborator_name: string | null
} | null> {
  const db = await getMongoDb()
  const doc = await db.collection('form_email_invites').findOne(
    { token_hash: tokenHash },
    {
      projection: {
        supabase_id: 1,
        template_id: 1,
        status: 1,
        expires_at: 1,
        used_at: 1,
        recipient_email: 1,
        company_id: 1,
        collaborator_id: 1,
        collaborator_external_employee_id: 1,
        collaborator_name: 1,
      },
    }
  )

  if (!doc?.supabase_id) return null
  return {
    id: String(doc.supabase_id),
    template_id: String(doc.template_id ?? ''),
    status: String(doc.status ?? ''),
    expires_at: String(doc.expires_at ?? ''),
    used_at: (doc.used_at as string | null | undefined) ?? null,
    recipient_email: (doc.recipient_email as string | null | undefined) ?? null,
    company_id: (doc.company_id as string | null | undefined) ?? null,
    collaborator_id: (doc.collaborator_id as string | null | undefined) ?? null,
    collaborator_external_employee_id: (doc.collaborator_external_employee_id as string | null | undefined) ?? null,
    collaborator_name: (doc.collaborator_name as string | null | undefined) ?? null,
  }
}

export async function insertSubmissionMongo(input: {
  id: string
  template_id: string
  company_id: string | null
  respondent_name: string | null
  respondent_email: string | null
  answers_json: unknown
  invite_id: string | null
}): Promise<void> {
  const db = await getMongoDb()
  await upsertCompanyFormSubmissions(db, [
    {
      ...input,
      created_at: new Date().toISOString(),
    },
  ])
}

export async function backupCompanyToSupabase(company: { id: string; cnpj: string; razao_social: string; nome_fantasia: string | null; status: string }): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from('companies').upsert(company, { onConflict: 'id' })
    if (error) throw error
  } catch (error) {
    console.error('[supabase-backup] companies upsert failed', { message: error instanceof Error ? error.message : 'UNKNOWN_ERROR', rawError: error })
  }
}

export async function backupUserProfileToSupabase(profile: { user_id: string; role: string; company_id: string | null; login_email: string; is_active: boolean }): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from('user_profiles').upsert(profile, { onConflict: 'user_id' })
    if (error) throw error
  } catch (error) {
    console.error('[supabase-backup] user_profiles upsert failed', { message: error instanceof Error ? error.message : 'UNKNOWN_ERROR', rawError: error })
  }
}

export async function backupInviteToSupabase(invite: Record<string, unknown>): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from('form_email_invites').upsert(invite, { onConflict: 'id' })
    if (error) throw error
  } catch (error) {
    console.error('[supabase-backup] form_email_invites upsert failed', { message: error instanceof Error ? error.message : 'UNKNOWN_ERROR', rawError: error })
  }
}

export async function backupTemplateToSupabase(template: Record<string, unknown>): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from('company_form_templates').upsert(template, { onConflict: 'id' })
    if (error) throw error
  } catch (error) {
    console.error('[supabase-backup] company_form_templates upsert failed', { message: error instanceof Error ? error.message : 'UNKNOWN_ERROR', rawError: error })
  }
}

export async function backupSubmissionToSupabase(submission: Record<string, unknown>): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from('company_form_submissions').upsert(submission, { onConflict: 'id' })
    if (error) throw error
  } catch (error) {
    console.error('[supabase-backup] company_form_submissions upsert failed', { message: error instanceof Error ? error.message : 'UNKNOWN_ERROR', rawError: error })
  }
}
