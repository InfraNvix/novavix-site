import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { normalizeCnpj, isValidCnpjFormat } from '@/lib/auth/cnpj'
import type { FormTemplateSchema } from '@/lib/forms/parser'
import { validateSubmissionAnswers } from '@/lib/forms/runtime'

type ApiErrorCode = 'INVALID_JSON' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR'

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

export async function POST(
  request: Request,
  context: { params: { templateId: string } }
): Promise<NextResponse> {
  try {
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

    const admin = getSupabaseAdminClient()
    const { data: templateData, error: templateError } = await admin
      .from('company_form_templates')
      .select(
        `
        id,
        template_name,
        schema_json,
        status
      `
      )
      .eq('id', templateId)
      .eq('status', 'active')
      .maybeSingle()

    if (templateError || !templateData?.id) {
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

    if (inviteToken) {
      const tokenHash = createHash('sha256').update(inviteToken).digest('hex')
      const { data: invite, error: inviteError } = await admin
        .from('form_email_invites')
        .select('id, template_id, status, expires_at, used_at')
        .eq('token_hash', tokenHash)
        .maybeSingle()

      if (inviteError || !invite?.id) {
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
          await admin.from('form_email_invites').update({ status: 'expired' }).eq('id', invite.id)
        }
        return errorResponse(422, 'VALIDATION_ERROR', 'Este convite expirou.')
      }
      inviteId = invite.id
    } else {
      if (!isValidCnpjFormat(cnpj)) {
        return errorResponse(422, 'VALIDATION_ERROR', 'CNPJ invalido.')
      }
      if (!collaboratorId && !collaboratorExternalEmployeeId) {
        return errorResponse(422, 'VALIDATION_ERROR', 'Selecione o colaborador.')
      }

      const { data: company, error: companyError } = await admin
        .from('companies')
        .select('id, cnpj, status')
        .eq('cnpj', cnpj)
        .eq('status', 'active')
        .maybeSingle()

      if (companyError || !company?.id) {
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

    const { data: inserted, error: insertError } = await admin
      .from('company_form_submissions')
      .insert({
        template_id: templateData.id,
        company_id: companyId,
        collaborator_id: collaboratorInsert.id,
        collaborator_external_employee_id: collaboratorInsert.externalEmployeeId,
        collaborator_name: collaboratorInsert.fullName,
        invite_id: inviteId,
        respondent_name: respondentName || collaboratorInsert.fullName || null,
        respondent_email: respondentEmail || null,
        answers_json: validated.normalizedAnswers,
      })
      .select('id, created_at')
      .single()

    if (insertError || !inserted?.id) {
      if (inviteId && insertError && typeof insertError === 'object' && 'code' in insertError && insertError.code === '23505') {
        return errorResponse(422, 'VALIDATION_ERROR', 'Este convite ja foi utilizado.')
      }
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao salvar respostas.')
    }

    if (inviteId) {
      const { error: inviteUpdateError } = await admin
        .from('form_email_invites')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
        })
        .eq('id', inviteId)
        .eq('status', 'pending')

      if (inviteUpdateError) {
        return errorResponse(500, 'INTERNAL_ERROR', 'Resposta salva, mas nao foi possivel finalizar o convite.')
      }
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
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao enviar formulario.', details)
  }
}
