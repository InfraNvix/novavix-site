import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { ImportActorMode } from '@/lib/imports/types'

export type ImportAuditInput = {
  eventName: string
  eventStatus: 'success' | 'failure' | 'denied'
  actorMode: ImportActorMode
  actorRole?: string | null
  actorUserId?: string | null
  actorEmail?: string | null
  companyId?: string | null
  jobId?: string | null
  endpoint?: string | null
  httpMethod?: string | null
  ip?: string | null
  payloadMeta?: Record<string, unknown> | null
  errorCode?: string | null
}

export async function writeImportAuditEvent(input: ImportAuditInput): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()

    await supabase.from('import_job_events').insert({
      job_id: input.jobId ?? null,
      event_name: input.eventName,
      event_status: input.eventStatus,
      actor_mode: input.actorMode,
      actor_role: input.actorRole ?? null,
      actor_user_id: input.actorUserId ?? null,
      actor_email: input.actorEmail ?? null,
      company_id: input.companyId ?? null,
      endpoint: input.endpoint ?? null,
      http_method: input.httpMethod ?? null,
      ip: input.ip ?? null,
      payload_meta: input.payloadMeta ?? null,
      error_code: input.errorCode ?? null,
    })
  } catch {
    // Non-blocking by design.
  }
}
