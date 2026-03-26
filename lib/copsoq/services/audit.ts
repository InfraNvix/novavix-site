import { getSupabaseAdminClient } from '@/lib/supabase/admin'

type CopsoqAuditStatus = 'success' | 'failure' | 'denied'
type CopsoqActorMode = 'api_key' | 'user' | 'system'

export type CopsoqAuditInput = {
  eventName: string
  eventStatus: CopsoqAuditStatus
  actorMode: CopsoqActorMode
  actorRole?: string | null
  actorUserId?: string | null
  actorEmail?: string | null
  companyId?: string | null
  sessionId?: string | null
  endpoint?: string | null
  httpMethod?: string | null
  ip?: string | null
  payloadMeta?: Record<string, unknown> | null
  errorCode?: string | null
}

export async function writeCopsoqAuditEvent(input: CopsoqAuditInput): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()

    await supabase.from('copsoq_audit_events').insert({
      event_name: input.eventName,
      event_status: input.eventStatus,
      actor_mode: input.actorMode,
      actor_role: input.actorRole ?? null,
      actor_user_id: input.actorUserId ?? null,
      actor_email: input.actorEmail ?? null,
      company_id: input.companyId ?? null,
      session_id: input.sessionId ?? null,
      endpoint: input.endpoint ?? null,
      http_method: input.httpMethod ?? null,
      ip: input.ip ?? null,
      payload_meta: input.payloadMeta ?? null,
      error_code: input.errorCode ?? null,
    })
  } catch {
    // Non-blocking by design: audit must not interrupt critical request flows.
  }
}
