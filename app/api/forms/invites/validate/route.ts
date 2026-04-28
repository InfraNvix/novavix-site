import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL_ERROR'

function errorResponse(status: number, code: ApiErrorCode, message: string, details?: string[]): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message, details: details ?? [] } }, { status })
}

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const inviteToken = asTrimmed(url.searchParams.get('invite'))
    if (!inviteToken) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Token de convite obrigatorio.')
    }

    const tokenHash = createHash('sha256').update(inviteToken).digest('hex')
    const admin = getSupabaseAdminClient()
    const { data: invite, error } = await admin
      .from('form_email_invites')
      .select('id, template_id, status, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (error || !invite?.id) {
      return errorResponse(404, 'NOT_FOUND', 'Convite invalido.')
    }

    const now = Date.now()
    const expiresAtMs = new Date(invite.expires_at).getTime()
    const isExpired = now > expiresAtMs
    const isUsed = invite.status === 'used' || Boolean(invite.used_at)
    const isRevoked = invite.status === 'revoked'

    if (isExpired && invite.status === 'pending') {
      await admin.from('form_email_invites').update({ status: 'expired' }).eq('id', invite.id)
    }

    if (isUsed) {
      return errorResponse(403, 'FORBIDDEN', 'Este link ja foi utilizado.')
    }
    if (isRevoked) {
      return errorResponse(403, 'FORBIDDEN', 'Este convite foi revogado.')
    }
    if (isExpired) {
      return errorResponse(403, 'FORBIDDEN', 'Este link expirou.')
    }

    const { data: template } = await admin
      .from('company_form_templates')
      .select('id, template_name, status')
      .eq('id', invite.template_id)
      .eq('status', 'active')
      .maybeSingle()

    if (!template?.id) {
      return errorResponse(404, 'NOT_FOUND', 'Template do convite nao encontrado.')
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          templateId: template.id,
          templateName: template.template_name,
          expiresAt: invite.expires_at,
          status: 'pending',
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao validar convite.', details)
  }
}
