import { getMongoDb } from '@/lib/mongodb/client'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  upsertCompanies,
  upsertCompanyFormSubmissions,
  upsertCompanyFormTemplates,
  upsertFormEmailInvites,
  upsertUserProfiles,
} from '@/lib/mongodb/mirror/supabase-sync'

type MirrorEntity =
  | 'companies'
  | 'user_profiles'
  | 'company_form_templates'
  | 'company_form_submissions'
  | 'form_email_invites'

function logMirrorError(entity: MirrorEntity, operation: string, error: unknown, referenceId: string): void {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
  console.error('[mongo-mirror write-through] failed', {
    entity,
    operation,
    referenceId,
    message,
    rawError: error,
  })
}

async function safeMirror(
  entity: MirrorEntity,
  operation: string,
  referenceId: string,
  task: () => Promise<void>
): Promise<void> {
  try {
    await task()
  } catch (error) {
    logMirrorError(entity, operation, error, referenceId)
  }
}

export async function mirrorFormEmailInviteById(inviteId: string, operation: string): Promise<void> {
  await safeMirror('form_email_invites', operation, inviteId, async () => {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('form_email_invites')
      .select(
        'id, template_id, recipient_email, company_id, collaborator_id, collaborator_external_employee_id, collaborator_name, token_hash, status, expires_at, used_at, sent_at, last_error, created_at, created_by'
      )
      .eq('id', inviteId)
      .maybeSingle()

    if (error) throw new Error(`SUPABASE_FETCH_FAILED:${error.message}`)
    if (!data?.id) return

    const db = await getMongoDb()
    await upsertFormEmailInvites(db, [data])
  })
}

export async function mirrorCompanyFormSubmissionById(submissionId: string, operation: string): Promise<void> {
  await safeMirror('company_form_submissions', operation, submissionId, async () => {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('company_form_submissions')
      .select('id, template_id, company_id, respondent_name, respondent_email, answers_json, invite_id, created_at')
      .eq('id', submissionId)
      .maybeSingle()

    if (error) throw new Error(`SUPABASE_FETCH_FAILED:${error.message}`)
    if (!data?.id) return

    const db = await getMongoDb()
    await upsertCompanyFormSubmissions(db, [data])
  })
}

export async function mirrorCompanyFormTemplateById(templateId: string, operation: string): Promise<void> {
  await safeMirror('company_form_templates', operation, templateId, async () => {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('company_form_templates')
      .select('id, company_id, template_name, source_format, source_file_name, schema_json, status, uploaded_by_user_id, created_at, updated_at')
      .eq('id', templateId)
      .maybeSingle()

    if (error) throw new Error(`SUPABASE_FETCH_FAILED:${error.message}`)
    if (!data?.id) return

    const db = await getMongoDb()
    await upsertCompanyFormTemplates(db, [data])
  })
}

export async function mirrorCompanyById(companyId: string, operation: string): Promise<void> {
  await safeMirror('companies', operation, companyId, async () => {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('companies')
      .select('id, cnpj, razao_social, nome_fantasia, status, created_at, updated_at')
      .eq('id', companyId)
      .maybeSingle()

    if (error) throw new Error(`SUPABASE_FETCH_FAILED:${error.message}`)
    if (!data?.id) return

    const db = await getMongoDb()
    await upsertCompanies(db, [data])
  })
}

export async function mirrorUserProfileByUserId(userId: string, operation: string): Promise<void> {
  await safeMirror('user_profiles', operation, userId, async () => {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, role, company_id, login_email, is_active, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new Error(`SUPABASE_FETCH_FAILED:${error.message}`)
    if (!data?.user_id) return

    const db = await getMongoDb()
    await upsertUserProfiles(db, [data])
  })
}
