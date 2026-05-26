import { NextResponse } from 'next/server'
import { createHash, randomUUID } from 'node:crypto'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { getClientIp } from '@/lib/security/http'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { normalizeCnpj, isValidCnpjFormat } from '@/lib/auth/cnpj'
import type { FormTemplateSchema } from '@/lib/forms/parser'
import { validateSubmissionAnswers } from '@/lib/forms/runtime'
import { getPublicErrorDetails, logServerError } from '@/lib/security/safe-error'
import {
  backupInviteToSupabase,
  backupSubmissionToSupabase,
  consumePendingInviteMongoById,
  findCompanyByCnpjMongo,
  findInviteByTokenHashMongo,
  findTemplateActiveByIdMongo,
  insertSubmissionMongo,
  updateInviteMongoById,
} from '@/lib/mongodb/primary-store'
import { mirrorCompanyById, mirrorFormEmailInviteById, mirrorCompanyFormTemplateById } from '@/lib/mongodb/mirror/write-through'

type ApiErrorCode = 'INVALID_JSON' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR' | 'TOO_MANY_REQUESTS'

function errorResponse(status: number, code: ApiErrorCode, message: string, details?: string[]): NextResponse {
  return NextResponse.json(
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
}

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

type ActiveTemplateRecord = {
  id: string
  company_id: string | null
  template_name: string
  schema_json?: unknown
}

export async function POST(
  request: Request,
  context: { params: { templateId: string } }
): Promise<NextResponse> {
  try {
    const ip = getClientIp(request)
    const rateLimit = await checkRateLimit(`forms-submit:${ip}`, { limit: 30, windowMs: 60_000 })
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

    const contentLength = Number(request.headers.get('content-length') ?? '0')
    if (Number.isFinite(contentLength) && contentLength > 120_000) {
      return errorResponse(413, 'VALIDATION_ERROR', 'Payload muito grande.')
    }

    const templateId = (context.params.templateId ?? '').trim()
    if (!templateId) {
      return errorResponse(422, 'VALIDATION_ERROR', 'templateId obrigatorio.')
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
    const cnpj = normalizeCnpj(asTrimmed(payload.cnpj))
    const respondentName = asTrimmed(payload.respondentName)
    const respondentEmail = asTrimmed(payload.respondentEmail).toLowerCase()
    const collaboratorId = asTrimmed(payload.collaboratorId)
    const collaboratorExternalEmployeeId = asTrimmed(payload.collaboratorExternalEmployeeId)
    const inviteToken = asTrimmed(payload.invite)
    const answersRaw = payload.answers

    if (!answersRaw || typeof answersRaw !== 'object' || Array.isArray(answersRaw)) {
      return errorResponse(422, 'VALIDATION_ERROR', 'answers deve ser um objeto.')
    }
    if (respondentEmail && !respondentEmail.includes('@')) {
      return errorResponse(422, 'VALIDATION_ERROR', 'E-mail do respondente invalido.')
    }

    let templateData: ActiveTemplateRecord | null = await findTemplateActiveByIdMongo(templateId)
    const admin = getSupabaseAdminClient()
    if (!templateData) {
      const { data } = await admin
        .from('company_form_templates')
        .select('id, company_id, template_name, schema_json, status')
        .eq('id', templateId)
        .eq('status', 'active')
        .maybeSingle()
      if (data?.id) {
        templateData = {
          id: data.id,
          company_id: data.company_id ?? null,
          template_name: data.template_name,
          schema_json: data.schema_json,
        }
        await mirrorCompanyFormTemplateById(data.id, 'fallback_read_template_submit')
      }
    }

    if (!templateData?.id) {
      return errorResponse(404, 'NOT_FOUND', 'Template nao encontrado.')
    }

    const schema = templateData.schema_json as FormTemplateSchema
    if (!schema || !Array.isArray(schema.fields)) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Schema do template invalido.')
    }

    const validated = validateSubmissionAnswers(schema, answersRaw as Record<string, unknown>)
    if (!validated.success) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Respostas invalidas.', validated.errors)
    }

    let companyId: string | null = null
    let collaboratorInsert: {
      id: string | null
      externalEmployeeId: string | null
      fullName: string | null
    } = {
      id: null,
      externalEmployeeId: null,
      fullName: null,
    }
    let inviteId: string | null = null

    let inviteUsedAtIso: string | null = null

    if (inviteToken) {
      const tokenHash = createHash('sha256').update(inviteToken).digest('hex')
      let invite = await findInviteByTokenHashMongo(tokenHash)
      if (!invite) {
        const { data } = await admin
          .from('form_email_invites')
          .select('id, template_id, recipient_email, status, expires_at, used_at')
          .eq('token_hash', tokenHash)
          .maybeSingle()
        if (data?.id) {
          invite = {
            id: data.id,
            template_id: data.template_id,
            recipient_email: data.recipient_email ?? null,
            status: data.status,
            expires_at: data.expires_at,
            used_at: data.used_at ?? null,
            company_id: null,
            collaborator_id: null,
            collaborator_external_employee_id: null,
            collaborator_name: null,
          }
          await mirrorFormEmailInviteById(data.id, 'fallback_read_invite_submit')
        }
      }

      if (!invite?.id) {
        return errorResponse(404, 'NOT_FOUND', 'Convite invalido.')
      }
      if (invite.template_id !== templateData.id) {
        return errorResponse(422, 'VALIDATION_ERROR', 'Convite nao pertence ao formulario informado.')
      }
      if (invite.status === 'used' || invite.used_at) {
        return errorResponse(422, 'VALIDATION_ERROR', 'Este convite ja foi utilizado.')
      }
      if (invite.status === 'revoked') {
        return errorResponse(422, 'VALIDATION_ERROR', 'Este convite foi revogado.')
      }
      if (Date.now() > new Date(invite.expires_at).getTime()) {
        if (invite.status === 'pending') {
          await updateInviteMongoById(invite.id, { status: 'expired' })
          await backupInviteToSupabase({ id: invite.id, status: 'expired' })
        }
        return errorResponse(422, 'VALIDATION_ERROR', 'Este convite expirou.')
      }
      inviteId = invite.id
      const inviteCompanyId = invite.company_id ?? templateData.company_id ?? null
      if (!inviteCompanyId) {
        return errorResponse(422, 'VALIDATION_ERROR', 'Convite sem empresa vinculada. Solicite um novo link.')
      }
      companyId = inviteCompanyId

      if (invite.collaborator_id) {
        const { data: collaborator, error: collaboratorError } = await admin
          .from('copsoq_collaborators')
          .select('id, external_employee_id, full_name, is_active')
          .eq('company_id', inviteCompanyId)
          .eq('id', invite.collaborator_id)
          .maybeSingle()

        if (collaboratorError || !collaborator?.id || !collaborator.is_active) {
          return errorResponse(422, 'VALIDATION_ERROR', 'Convite sem colaborador valido. Solicite um novo link.')
        }

        collaboratorInsert = {
          id: collaborator.id,
          externalEmployeeId: collaborator.external_employee_id ?? invite.collaborator_external_employee_id ?? null,
          fullName: collaborator.full_name ?? invite.collaborator_name ?? null,
        }
      } else if (invite.collaborator_external_employee_id) {
        const { data: collaborator, error: collaboratorError } = await admin
          .from('copsoq_collaborators')
          .select('id, external_employee_id, full_name, is_active')
          .eq('company_id', inviteCompanyId)
          .eq('external_employee_id', invite.collaborator_external_employee_id)
          .maybeSingle()

        if (collaboratorError || !collaborator?.id || !collaborator.is_active) {
          return errorResponse(422, 'VALIDATION_ERROR', 'Convite sem colaborador valido. Solicite um novo link.')
        }

        collaboratorInsert = {
          id: collaborator.id,
          externalEmployeeId: collaborator.external_employee_id ?? invite.collaborator_external_employee_id,
          fullName: collaborator.full_name ?? invite.collaborator_name ?? null,
        }
      } else if (invite.collaborator_name) {
        collaboratorInsert.fullName = invite.collaborator_name
      }

      inviteUsedAtIso = new Date().toISOString()
      const consumedInvite = await consumePendingInviteMongoById(inviteId, inviteUsedAtIso)

      if (!consumedInvite) {
        return errorResponse(409, 'VALIDATION_ERROR', 'Este convite ja foi utilizado.')
      }

      await backupInviteToSupabase({
        id: inviteId,
        status: 'used',
        used_at: inviteUsedAtIso,
      })
    } else {
      if (!isValidCnpjFormat(cnpj)) {
        return errorResponse(422, 'VALIDATION_ERROR', 'CNPJ invalido.')
      }
      if (!collaboratorId && !collaboratorExternalEmployeeId) {
        return errorResponse(422, 'VALIDATION_ERROR', 'Selecione o colaborador.')
      }

      let company = await findCompanyByCnpjMongo(cnpj)
      if (!company) {
        const { data } = await admin
          .from('companies')
          .select('id, cnpj, status')
          .eq('cnpj', cnpj)
          .eq('status', 'active')
          .maybeSingle()
        if (data?.id) {
          company = data
          await mirrorCompanyById(data.id, 'fallback_read_company_submit')
        }
      }

      if (!company?.id) {
        return errorResponse(404, 'NOT_FOUND', 'Empresa nao encontrada para este CNPJ.')
      }
      companyId = company.id

      let collaboratorQuery = admin
        .from('copsoq_collaborators')
        .select('id, external_employee_id, full_name, is_active, company_id')
        .eq('company_id', company.id)

      if (collaboratorId) {
        collaboratorQuery = collaboratorQuery.eq('id', collaboratorId)
      } else {
        collaboratorQuery = collaboratorQuery.eq('external_employee_id', collaboratorExternalEmployeeId)
      }

      const { data: collaborator, error: collaboratorError } = await collaboratorQuery.maybeSingle()
      if (collaboratorError || !collaborator?.id || !collaborator.is_active) {
        return errorResponse(404, 'NOT_FOUND', 'Colaborador nao encontrado.')
      }

      collaboratorInsert = {
        id: collaborator.id,
        externalEmployeeId: collaborator.external_employee_id ?? null,
        fullName: collaborator.full_name ?? null,
      }
    }

    if (!companyId) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Nao foi possivel resolver a empresa deste envio.')
    }

    const submissionId = randomUUID()
    const submissionPayload = {
      id: submissionId,
      template_id: templateData.id,
      company_id: companyId,
      collaborator_id: collaboratorInsert.id,
      collaborator_external_employee_id: collaboratorInsert.externalEmployeeId,
      collaborator_name: collaboratorInsert.fullName,
      invite_id: inviteId,
      respondent_name: respondentName || collaboratorInsert.fullName || null,
      respondent_email: respondentEmail || null,
      answers_json: validated.normalizedAnswers,
    }
    await insertSubmissionMongo({
      id: submissionId,
      template_id: submissionPayload.template_id,
      company_id: submissionPayload.company_id,
      respondent_name: submissionPayload.respondent_name,
      respondent_email: submissionPayload.respondent_email,
      answers_json: submissionPayload.answers_json,
      invite_id: submissionPayload.invite_id,
    })
    await backupSubmissionToSupabase(submissionPayload)

    const inserted = {
      id: submissionId,
      created_at: new Date().toISOString(),
    }

    if (inviteId && inviteUsedAtIso) {
      await updateInviteMongoById(inviteId, { used_at: inviteUsedAtIso })
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          submissionId: inserted.id,
          submittedAt: inserted.created_at,
          templateName: templateData.template_name,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    logServerError('POST /api/forms/[templateId]/submit failed', error, {
      templateId: context.params.templateId,
    })
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao enviar formulario.', getPublicErrorDetails(error))
  }
}
