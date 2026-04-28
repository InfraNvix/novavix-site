import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendFormInvite } from '@/lib/email/send-form-invite'

type ApiErrorCode = 'INVALID_JSON' | 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_EXPIRES_IN_DAYS = 7
const MIN_EXPIRES_IN_DAYS = 1
const MAX_EXPIRES_IN_DAYS = 30
const DEDUP_WINDOW_MINUTES = Number(process.env.FORM_EMAIL_INVITE_DEDUP_MINUTES ?? '5')

function errorResponse(status: number, code: ApiErrorCode, message: string, details?: string[]): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message, details: details ?? [] } }, { status })
}

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getAppBaseUrl(): string {
  const base = asTrimmed(process.env.NEXT_PUBLIC_APP_URL)
  if (!base) throw new Error('MISSING_NEXT_PUBLIC_APP_URL')
  return base
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function describeDbError(error: unknown): string[] {
  if (!error || typeof error !== 'object') return []
  const maybe = error as { code?: string; message?: string; details?: string | null; hint?: string | null }
  const parts = [maybe.code, maybe.message, maybe.details ?? undefined, maybe.hint ?? undefined].filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  )
  return parts
}

function describeRuntimeError(error: unknown): string[] {
  if (!error || typeof error !== 'object') {
    if (typeof error === 'string' && error.trim().length > 0) return [error]
    return []
  }
  const maybe = error as {
    name?: string
    message?: string
    code?: string
    command?: string
    response?: string
    responseCode?: number
  }
  const parts = [
    maybe.name,
    maybe.message,
    maybe.code,
    maybe.command,
    maybe.response,
    typeof maybe.responseCode === 'number' ? String(maybe.responseCode) : undefined,
  ].filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  return parts
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse(401, 'UNAUTHORIZED', 'Sessao invalida.')
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.is_active) {
      return errorResponse(403, 'FORBIDDEN', 'Perfil inativo.')
    }
    if (profile.role !== 'admin') {
      return errorResponse(403, 'FORBIDDEN', 'Acesso restrito ao admin.')
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Body JSON invalido.')
    }
    if (!body || typeof body !== 'object') {
      return errorResponse(422, 'VALIDATION_ERROR', 'Payload invalido.')
    }

    const payload = body as Record<string, unknown>
    const recipientEmail = normalizeEmail(asTrimmed(payload.recipientEmail))
    const templateId = asTrimmed(payload.templateId)
    const expiresInDaysRaw = Number(payload.expiresInDays ?? DEFAULT_EXPIRES_IN_DAYS)
    const expiresInDays = Number.isFinite(expiresInDaysRaw) ? Math.floor(expiresInDaysRaw) : NaN

    const errors: string[] = []
    if (!EMAIL_REGEX.test(recipientEmail)) errors.push('E-mail de destino invalido.')
    if (!templateId) errors.push('templateId obrigatorio.')
    if (!Number.isInteger(expiresInDays) || expiresInDays < MIN_EXPIRES_IN_DAYS || expiresInDays > MAX_EXPIRES_IN_DAYS) {
      errors.push(`expiresInDays deve estar entre ${MIN_EXPIRES_IN_DAYS} e ${MAX_EXPIRES_IN_DAYS}.`)
    }
    if (errors.length > 0) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Dados invalidos para envio.', errors)
    }

    const admin = getSupabaseAdminClient()
    const { data: template, error: templateError } = await admin
      .from('company_form_templates')
      .select('id, template_name, status')
      .eq('id', templateId)
      .eq('status', 'active')
      .maybeSingle()

    if (templateError || !template?.id) {
      return errorResponse(404, 'NOT_FOUND', 'Template nao encontrado ou inativo.')
    }

    const dedupThreshold = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60_000).toISOString()
    const { data: recentPending, error: recentPendingError } = await admin
      .from('form_email_invites')
      .select('id, created_at')
      .eq('template_id', template.id)
      .eq('recipient_email', recipientEmail)
      .eq('status', 'pending')
      .gte('created_at', dedupThreshold)
      .limit(1)
      .maybeSingle()

    if (recentPendingError) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao consultar convites pendentes.', describeDbError(recentPendingError))
    }

    if (recentPending?.id) {
      return errorResponse(409, 'CONFLICT', 'Ja existe um convite recente para este e-mail e template.')
    }

    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()

    const { data: invite, error: inviteError } = await admin
      .from('form_email_invites')
      .insert({
        template_id: template.id,
        recipient_email: recipientEmail,
        token_hash: tokenHash,
        status: 'pending',
        expires_at: expiresAt,
        created_by: user.id,
        sent_at: null,
        last_error: null,
      })
      .select('id, expires_at, created_at')
      .single()

    if (inviteError || !invite?.id) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao registrar convite.', describeDbError(inviteError))
    }

    const formUrl = new URL(`/formularios/${template.id}`, getAppBaseUrl())
    formUrl.searchParams.set('invite', token)

    try {
      await sendFormInvite({
        to: recipientEmail,
        collaboratorName: null,
        templateName: template.template_name,
        formUrl: formUrl.toString(),
        expiresAtIso: expiresAt,
        subject: 'Voce recebeu um formulario para preenchimento',
      })
    } catch (mailError) {
      const runtimeDetails = describeRuntimeError(mailError)
      const lastError = runtimeDetails.join(' | ').slice(0, 4000)
      await admin
        .from('form_email_invites')
        .update({
          status: 'revoked',
          last_error: lastError || 'EMAIL_SEND_FAILED',
        })
        .eq('id', invite.id)
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao enviar e-mail de convite.', runtimeDetails)
    }

    const sentAt = new Date().toISOString()
    await admin
      .from('form_email_invites')
      .update({
        sent_at: sentAt,
        last_error: null,
      })
      .eq('id', invite.id)

    return NextResponse.json(
      {
        ok: true,
        data: {
          inviteId: invite.id,
          templateId: template.id,
          recipientEmail,
          expiresAt: invite.expires_at,
          createdAt: invite.created_at,
          sentAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao enviar convite por e-mail.', details)
  }
}
