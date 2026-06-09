import { getMongoDb } from '@/lib/mongodb/client'

type AuthAuditEvent = {
  event: 'login' | 'password_reset_request'
  status: 'success' | 'failure'
  identifier: string
  mode?: string
  ip: string
  userAgent: string | null
  reason?: string
}

export async function recordAuthAuditEvent(event: AuthAuditEvent): Promise<void> {
  try {
    const db = await getMongoDb()
    await db.collection('auth_audit_events').insertOne({
      ...event,
      created_at: new Date(),
    })
  } catch (error) {
    console.error('[auth-audit] failed', {
      message: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      event: event.event,
      status: event.status,
      mode: event.mode,
    })
  }
}
