import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { getClientIp } from '@/lib/security/http'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { backupInviteToSupabase, findInviteByTokenHashMongo, findTemplateActiveByIdMongo, updateInviteMongoById } from '@/lib/mongodb/primary-store'
import { mirrorFormEmailInviteById } from '@/lib/mongodb/mirror/write-through'

type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL_ERROR'

function errorResponse(status: number, code: ApiErrorCode, message: string, details?: string[]): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message, details: details ?? [] } }, { status })
}

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const ip = getClientIp(request)
    const rateLimit = await checkRateLimit(`forms-invite-validate:${ip}`, { limit: 60, windowMs: 60_000 })
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas requisicoes. Tente novamente em instantes.' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSec),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        }
      )
    }

    const url = new URL(request.url)
    const inviteToken = asTrimmed(url.searchParams.get('invite'))
    if (!inviteToken) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Token de convite obrigatorio.')
    }

    const tokenHash = createHash('sha256').update(inviteToken).digest('hex')
    let invite = await findInviteByTokenHashMongo(tokenHash)
    if (!invite) {
      const admin = getSupabaseAdminClient()
      const { data } = await admin
        .from('form_email_invites')
        .select('id, template_id, status, expires_at, used_at')
        .eq('token_hash', tokenHash)
        .maybeSingle()
      if (data?.id) {
        invite = data
        await mirrorFormEmailInviteById(data.id, 'fallback_read_invite_validate')
      }
    }

    if (!invite?.id) {
      return errorResponse(404, 'NOT_FOUND', 'Convite invalido.')
    }

    const now = Date.now()
    const expiresAtMs = new Date(invite.expires_at).getTime()
    const isExpired = now > expiresAtMs
    const isUsed = invite.status === 'used' || Boolean(invite.used_at)
    const isRevoked = invite.status === 'revoked'
    const isFailed = invite.status === 'failed'

    if (isExpired && invite.status === 'pending') {
      await updateInviteMongoById(invite.id, { status: 'expired' })
      await backupInviteToSupabase({ id: invite.id, status: 'expired' })
    }

    if (isUsed) {
      return errorResponse(403, 'FORBIDDEN', 'Este link ja foi utilizado.')
    }
    if (isRevoked) {
      return errorResponse(403, 'FORBIDDEN', 'Este convite foi revogado.')
    }
    if (isFailed) {
      return errorResponse(403, 'FORBIDDEN', 'Este convite nao esta mais disponivel.')
    }
    if (isExpired) {
      return errorResponse(403, 'FORBIDDEN', 'Este link expirou.')
    }

    const template = await findTemplateActiveByIdMongo(invite.template_id)

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

