import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { canAccessCompanyScope, resolveCopsoqAccessContext } from '@/lib/copsoq/auth/access'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendFormInvite } from '@/lib/email/send-form-invite'

type ApiErrorCode =
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'TOO_MANY_REQUESTS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'

type InvitePayload = {
  templateId: string
  companyId: string
  collaboratorExternalEmployeeIds: string[]
}

type InviteDedupState = {
  sentAt: number
}

const inviteDedupStore = new Map<string, InviteDedupState>()
const INVITE_DEDUP_WINDOW_MS = Number(process.env.FORM_INVITE_DEDUP_WINDOW_MS ?? '300000')
const INVITE_DEDUP_MAX_KEYS = 10000

function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: string[],
  headers?: Record<string, string>
): NextResponse {
  const response = NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details: details ?? [],
      },
    },
    { status }
  )

  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value)
    }
  }

  return response
}

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parsePayload(input: unknown): { success: true; data: InvitePayload } | { success: false; errors: string[] } {
  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Payload deve ser um objeto JSON valido.'] }
  }

  const payload = input as Record<string, unknown>
  const templateId = asTrimmed(payload.templateId)
  const companyId = asTrimmed(payload.companyId)
  const collaboratorExternalEmployeeIdsRaw = Array.isArray(payload.collaboratorExternalEmployeeIds)
    ? payload.collaboratorExternalEmployeeIds
    : []

  const collaboratorExternalEmployeeIds = Array.from(
    new Set(
      collaboratorExternalEmployeeIdsRaw
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  )

  const errors: string[] = []
  if (!templateId) errors.push('Campo "templateId" e obrigatorio.')
  if (!companyId) errors.push('Campo "companyId" e obrigatorio.')
  if (collaboratorExternalEmployeeIds.length === 0) {
    errors.push('Selecione ao menos um colaborador para envio de convite.')
  }
  if (collaboratorExternalEmployeeIds.length > 1000) {
    errors.push('Limite de 1000 colaboradores por envio.')
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      templateId,
      companyId,
      collaboratorExternalEmployeeIds,
    },
  }
}

function getAppBaseUrl(): string {
  const base = asTrimmed(process.env.NEXT_PUBLIC_APP_URL)
  if (!base) {
    throw new Error('MISSING_NEXT_PUBLIC_APP_URL')
  }
  return base
}

function getInviteDedupKey(templateId: string, companyId: string, collaboratorExternalEmployeeId: string): string {
  return `${templateId}:${companyId}:${collaboratorExternalEmployeeId}`
}

function cleanupInviteDedupStore(nowMs: number): void {
  for (const [key, value] of inviteDedupStore.entries()) {
    if (nowMs - value.sentAt > INVITE_DEDUP_WINDOW_MS) {
      inviteDedupStore.delete(key)
    }
  }

  if (inviteDedupStore.size <= INVITE_DEDUP_MAX_KEYS) {
    return
  }

  const sorted = Array.from(inviteDedupStore.entries()).sort((a, b) => a[1].sentAt - b[1].sentAt)
  const overflow = inviteDedupStore.size - INVITE_DEDUP_MAX_KEYS
  for (let index = 0; index < overflow; index += 1) {
    const key = sorted[index]?.[0]
    if (key) inviteDedupStore.delete(key)
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request)

  try {
    const access = await resolveCopsoqAccessContext(request)
    if (!access) {
      return errorResponse(401, 'UNAUTHORIZED', 'Acesso nao autorizado para envio de convites.')
    }

    const rateLimit = await checkRateLimit(`forms-invites-send:${ip}`, { limit: 20, windowMs: 60_000 })
    if (!rateLimit.allowed) {
      return errorResponse(
        429,
        'TOO_MANY_REQUESTS',
        'Rate limit exceeded.',
        [],
        {
          'Retry-After': String(rateLimit.retryAfterSec),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Body precisa ser JSON valido.')
    }

    const parsed = parsePayload(body)
    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Dados de envio invalidos.', parsed.errors)
    }

    if (!canAccessCompanyScope(access, parsed.data.companyId)) {
      return errorResponse(403, 'FORBIDDEN', 'Sem permissao para enviar convites desta empresa.')
    }

    const supabase = getSupabaseAdminClient()
    const { data: template, error: templateError } = await supabase
      .from('company_form_templates')
      .select('id, template_name, status, company_id')
      .eq('id', parsed.data.templateId)
      .eq('status', 'active')
      .maybeSingle()

    if (templateError || !template?.id) {
      return errorResponse(404, 'NOT_FOUND', 'Template nao encontrado para envio.')
    }
    if (template.company_id && template.company_id !== parsed.data.companyId) {
      return errorResponse(403, 'FORBIDDEN', 'Template nao pertence a empresa informada.')
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, cnpj, status')
      .eq('id', parsed.data.companyId)
      .eq('status', 'active')
      .maybeSingle()

    if (companyError || !company?.id || !company.cnpj) {
      return errorResponse(404, 'NOT_FOUND', 'Empresa nao encontrada para envio.')
    }

    const { data: collaborators, error: collaboratorError } = await supabase
      .from('copsoq_collaborators')
      .select('id, external_employee_id, full_name, email, is_active')
      .eq('company_id', parsed.data.companyId)
      .eq('is_active', true)
      .in('external_employee_id', parsed.data.collaboratorExternalEmployeeIds)

    if (collaboratorError || !collaborators) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao buscar colaboradores para envio.')
    }

    if (collaborators.length === 0) {
      return errorResponse(404, 'NOT_FOUND', 'Nenhum colaborador encontrado para envio.')
    }

    const appBaseUrl = getAppBaseUrl()
    const failures: Array<{ collaboratorExternalEmployeeId: string | null; reason: string }> = []
    const skippedDuplicates: Array<{ collaboratorExternalEmployeeId: string; reason: string }> = []
    const sentTo: string[] = []
    const nowMs = Date.now()
    cleanupInviteDedupStore(nowMs)

    for (const collaborator of collaborators) {
      const recipientEmail = asTrimmed(collaborator.email).toLowerCase()
      const collaboratorExternalEmployeeId = asTrimmed(collaborator.external_employee_id)
      if (!collaboratorExternalEmployeeId) {
        failures.push({
          collaboratorExternalEmployeeId: null,
          reason: 'COLLABORATOR_EXTERNAL_EMPLOYEE_ID_MISSING',
        })
        continue
      }

      const dedupKey = getInviteDedupKey(template.id, company.id, collaboratorExternalEmployeeId)
      const previous = inviteDedupStore.get(dedupKey)
      if (previous && nowMs - previous.sentAt <= INVITE_DEDUP_WINDOW_MS) {
        skippedDuplicates.push({
          collaboratorExternalEmployeeId,
          reason: 'DUPLICATE_INVITE_RECENTLY_SENT',
        })
        continue
      }

      if (!recipientEmail || !recipientEmail.includes('@')) {
        failures.push({
          collaboratorExternalEmployeeId,
          reason: 'COLLABORATOR_EMAIL_MISSING_OR_INVALID',
        })
        continue
      }

      try {
        const formUrl = new URL(`/formularios/${template.id}`, appBaseUrl)
        formUrl.searchParams.set('cnpj', company.cnpj)
        formUrl.searchParams.set('collaboratorExternalEmployeeId', collaboratorExternalEmployeeId)

        await sendFormInvite({
          to: recipientEmail,
          collaboratorName: collaborator.full_name,
          templateName: template.template_name,
          formUrl: formUrl.toString(),
        })
        sentTo.push(recipientEmail)
        inviteDedupStore.set(dedupKey, { sentAt: nowMs })
      } catch (error) {
        failures.push({
          collaboratorExternalEmployeeId,
          reason: error instanceof Error ? error.message : 'EMAIL_SEND_FAILED',
        })
      }
    }

    if (sentTo.length === 0 && skippedDuplicates.length === 0) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao enviar convites por e-mail.', failures.map((item) => item.reason))
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          templateId: template.id,
          templateName: template.template_name,
          companyId: company.id,
          sentCount: sentTo.length,
          skippedDuplicateCount: skippedDuplicates.length,
          failedCount: failures.length,
          skippedDuplicates,
          failures,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao enviar convites por e-mail.', details)
  }
}
